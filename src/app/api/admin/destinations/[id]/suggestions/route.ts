import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';
import Offer from '@/models/Offer';
import Activity from '@/models/Activity';
import { Types } from 'mongoose';

// GET /api/admin/destinations/[id]/suggestions - Get content suggestions for a destination
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid destination ID' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Get the destination
    const destination = await Destination.findById(id);
    if (!destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      );
    }

    // Get suggestions based on location and content similarity
    const suggestions = await generateContentSuggestions(destination);

    return NextResponse.json(suggestions);

  } catch (error) {
    console.error('Error generating content suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

async function generateContentSuggestions(destination: any) {
  const suggestions = {
    offers: [],
    activities: [],
    destinations: []
  };

  try {
    // Find offers in the same country/region
    const relatedOffers = await Offer.find({
      $and: [
        { _id: { $nin: destination.relatedOffers || [] } },
        {
          $or: [
            { destination: { $regex: destination.country, $options: 'i' } },
            { destination: { $regex: destination.region, $options: 'i' } },
            { destination: { $regex: destination.name, $options: 'i' } }
          ]
        }
      ]
    })
    .limit(10)
    .select('name description price destination')
    .lean();

    suggestions.offers = relatedOffers.map(offer => ({
      ...offer,
      score: calculateOfferScore(offer, destination),
      reason: getOfferSuggestionReason(offer, destination)
    }));

    // Find activities in the same country/region
    const relatedActivities = await Activity.find({
      $and: [
        { _id: { $nin: destination.relatedActivities || [] } },
        {
          $or: [
            { location: { $regex: destination.country, $options: 'i' } },
            { location: { $regex: destination.region, $options: 'i' } },
            { location: { $regex: destination.name, $options: 'i' } }
          ]
        }
      ]
    })
    .limit(10)
    .select('name description price location category')
    .lean();

    suggestions.activities = relatedActivities.map(activity => ({
      ...activity,
      score: calculateActivityScore(activity, destination),
      reason: getActivitySuggestionReason(activity, destination)
    }));

    // Find destinations in the same country or similar regions
    const relatedDestinations = await Destination.find({
      $and: [
        { _id: { $ne: destination._id } },
        { _id: { $nin: destination.relatedDestinations || [] } },
        { status: 'published' },
        {
          $or: [
            { country: destination.country },
            { region: { $regex: destination.region, $options: 'i' } }
          ]
        }
      ]
    })
    .limit(10)
    .select('name description country region slug')
    .lean();

    suggestions.destinations = relatedDestinations.map(dest => ({
      ...dest,
      score: calculateDestinationScore(dest, destination),
      reason: getDestinationSuggestionReason(dest, destination)
    }));

    // Sort by score (highest first)
    suggestions.offers.sort((a, b) => b.score - a.score);
    suggestions.activities.sort((a, b) => b.score - a.score);
    suggestions.destinations.sort((a, b) => b.score - a.score);

  } catch (error) {
    console.error('Error in generateContentSuggestions:', error);
  }

  return suggestions;
}

function calculateOfferScore(offer: any, destination: any): number {
  let score = 0;
  
  // Exact country match
  if (offer.destination?.toLowerCase().includes(destination.country.toLowerCase())) {
    score += 10;
  }
  
  // Region match
  if (offer.destination?.toLowerCase().includes(destination.region.toLowerCase())) {
    score += 8;
  }
  
  // Destination name match
  if (offer.destination?.toLowerCase().includes(destination.name.toLowerCase())) {
    score += 15;
  }
  
  // Content similarity (basic keyword matching)
  const offerText = `${offer.name} ${offer.description}`.toLowerCase();
  const destText = `${destination.name} ${destination.description}`.toLowerCase();
  
  const commonWords = ['beach', 'hotel', 'resort', 'spa', 'restaurant', 'nightlife', 'shopping'];
  commonWords.forEach(word => {
    if (offerText.includes(word) && destText.includes(word)) {
      score += 2;
    }
  });
  
  return score;
}

function calculateActivityScore(activity: any, destination: any): number {
  let score = 0;
  
  // Location matching
  if (activity.location?.toLowerCase().includes(destination.country.toLowerCase())) {
    score += 10;
  }
  
  if (activity.location?.toLowerCase().includes(destination.region.toLowerCase())) {
    score += 8;
  }
  
  if (activity.location?.toLowerCase().includes(destination.name.toLowerCase())) {
    score += 15;
  }
  
  // Category relevance
  const beachDestination = destination.description?.toLowerCase().includes('beach') || 
                          destination.name.toLowerCase().includes('beach');
  
  if (beachDestination && activity.category?.toLowerCase().includes('water')) {
    score += 5;
  }
  
  return score;
}

function calculateDestinationScore(dest: any, destination: any): number {
  let score = 0;
  
  // Same country
  if (dest.country === destination.country) {
    score += 10;
  }
  
  // Similar region
  if (dest.region?.toLowerCase().includes(destination.region.toLowerCase()) ||
      destination.region.toLowerCase().includes(dest.region?.toLowerCase())) {
    score += 8;
  }
  
  // Content similarity
  const destText = `${dest.description}`.toLowerCase();
  const sourceText = `${destination.description}`.toLowerCase();
  
  const keywords = ['beach', 'mountain', 'city', 'island', 'resort', 'historic', 'cultural'];
  keywords.forEach(keyword => {
    if (destText.includes(keyword) && sourceText.includes(keyword)) {
      score += 3;
    }
  });
  
  return score;
}

function getOfferSuggestionReason(offer: any, destination: any): string {
  if (offer.destination?.toLowerCase().includes(destination.name.toLowerCase())) {
    return `Specifically for ${destination.name}`;
  }
  if (offer.destination?.toLowerCase().includes(destination.region.toLowerCase())) {
    return `Located in ${destination.region}`;
  }
  if (offer.destination?.toLowerCase().includes(destination.country.toLowerCase())) {
    return `Located in ${destination.country}`;
  }
  return 'Similar destination type';
}

function getActivitySuggestionReason(activity: any, destination: any): string {
  if (activity.location?.toLowerCase().includes(destination.name.toLowerCase())) {
    return `Available in ${destination.name}`;
  }
  if (activity.location?.toLowerCase().includes(destination.region.toLowerCase())) {
    return `Available in ${destination.region}`;
  }
  if (activity.location?.toLowerCase().includes(destination.country.toLowerCase())) {
    return `Available in ${destination.country}`;
  }
  return 'Relevant activity type';
}

function getDestinationSuggestionReason(dest: any, destination: any): string {
  if (dest.country === destination.country && dest.region === destination.region) {
    return `Same region (${dest.region})`;
  }
  if (dest.country === destination.country) {
    return `Same country (${dest.country})`;
  }
  return 'Similar destination type';
}