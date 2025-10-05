import DOMPurify from 'isomorphic-dompurify';
import { IQuote } from '@/models/Quote';
import { IEnquiry } from '@/models/Enquiry';

export interface SecureEmailContext {
  quote: IQuote;
  enquiry: IEnquiry;
  companyInfo: {
    name: string;
    email: string;
    phone: string;
    website: string;
  };
}

export class SecureEmailRenderer {
  /**
   * Sanitize text content to prevent XSS attacks
   */
  static sanitizeText(text: string): string {
    if (!text) return '';
    
    // Remove any HTML tags and decode HTML entities
    const cleanText = DOMPurify.sanitize(text, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });
    
    // Additional sanitization for email context
    return cleanText
      .replace(/[<>]/g, '') // Remove any remaining angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/data:/gi, '') // Remove data: protocols
      .replace(/vbscript:/gi, '') // Remove vbscript: protocols
      .trim();
  }

  /**
   * Sanitize HTML content for email templates
   */
  static sanitizeHTML(html: string): string {
    if (!html) return '';
    
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'table', 'thead', 'tbody', 'tr', 'td', 'th',
        'a'
      ],
      ALLOWED_ATTR: [
        'style', 'class', 'href', 'target', 'rel'
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      ADD_ATTR: ['target'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover'],
    });
  }

  /**
   * Sanitize currency values
   */
  static sanitizeCurrency(amount: number, currency: string = 'GBP'): string {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '£0.00';
    }

    const sanitizedCurrency = this.sanitizeText(currency).toUpperCase();
    const validCurrencies = ['GBP', 'EUR', 'USD'];
    const safeCurrency = validCurrencies.includes(sanitizedCurrency) ? sanitizedCurrency : 'GBP';

    const currencySymbols: Record<string, string> = {
      GBP: '£',
      EUR: '€',
      USD: '$',
    };

    const symbol = currencySymbols[safeCurrency] || '£';
    return `${symbol}${Math.abs(amount).toFixed(2)}`;
  }

  /**
   * Sanitize date values
   */
  static sanitizeDate(date: Date | string): string {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      return dateObj.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  }

  /**
   * Sanitize email addresses
   */
  static sanitizeEmail(email: string): string {
    if (!email) return '';
    
    const cleanEmail = this.sanitizeText(email).toLowerCase();
    
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(cleanEmail)) {
      return '';
    }
    
    return cleanEmail;
  }

  /**
   * Sanitize phone numbers
   */
  static sanitizePhone(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-digit characters except + and spaces
    const cleanPhone = phone.replace(/[^\d+\s()-]/g, '');
    
    // Basic phone validation (must start with + or digit, reasonable length)
    if (cleanPhone.length < 7 || cleanPhone.length > 20) {
      return '';
    }
    
    return cleanPhone;
  }

  /**
   * Sanitize URLs
   */
  static sanitizeURL(url: string): string {
    if (!url) return '';
    
    try {
      const cleanUrl = this.sanitizeText(url);
      const urlObj = new URL(cleanUrl);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return '';
      }
      
      return urlObj.toString();
    } catch {
      return '';
    }
  }

  /**
   * Create secure email context with sanitized data
   */
  static createSecureContext(context: SecureEmailContext): SecureEmailContext {
    return {
      quote: {
        ...context.quote,
        leadName: this.sanitizeText(context.quote.leadName),
        hotelName: this.sanitizeText(context.quote.hotelName),
        whatsIncluded: this.sanitizeHTML(context.quote.whatsIncluded),
        activitiesIncluded: this.sanitizeHTML(context.quote.activitiesIncluded || ''),
        internalNotes: this.sanitizeText(context.quote.internalNotes || ''),
        totalPrice: Math.abs(context.quote.totalPrice || 0),
        currency: this.sanitizeText(context.quote.currency || 'GBP'),
      },
      enquiry: {
        ...context.enquiry,
        leadName: this.sanitizeText(context.enquiry.leadName),
        agentEmail: this.sanitizeEmail(context.enquiry.agentEmail),
        resort: this.sanitizeText(context.enquiry.resort || ''),
        message: this.sanitizeHTML(context.enquiry.message || ''),
      },
      companyInfo: {
        name: this.sanitizeText(context.companyInfo.name),
        email: this.sanitizeEmail(context.companyInfo.email),
        phone: this.sanitizePhone(context.companyInfo.phone),
        website: this.sanitizeURL(context.companyInfo.website),
      },
    };
  }

  /**
   * Generate secure quote email HTML
   */
  static generateSecureQuoteEmail(context: SecureEmailContext): string {
    const secureContext = this.createSecureContext(context);
    const { quote, enquiry, companyInfo } = secureContext;

    // Generate secure tracking token (without exposing sensitive data)
    const trackingToken = this.generateSecureTrackingToken(quote._id.toString());

    const emailHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quote from ${companyInfo.name}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; }
        .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .quote-details { background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .price-highlight { background: #e8f5e8; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; color: #2c5aa0; margin: 20px 0; border-radius: 5px; }
        .cta-button { display: inline-block; background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3004'}/infinity-weekends-logo.png" 
                 alt="${companyInfo.name} Logo" 
                 style="max-width: 200px; height: auto; margin-bottom: 10px;" />
            <h1>${companyInfo.name}</h1>
            <p>Your Holiday Quote</p>
        </div>
        
        <div class="content">
            <h2>Dear ${quote.leadName},</h2>
            
            <p>Thank you for your enquiry. We're delighted to provide you with a personalized quote for your upcoming holiday.</p>
            
            <div class="quote-details">
                <h3>Quote Details</h3>
                <table>
                    <tr><th>Hotel</th><td>${quote.hotelName}</td></tr>
                    <tr><th>Number of People</th><td>${quote.numberOfPeople}</td></tr>
                    <tr><th>Number of Rooms</th><td>${quote.numberOfRooms}</td></tr>
                    <tr><th>Number of Nights</th><td>${quote.numberOfNights}</td></tr>
                    <tr><th>Arrival Date</th><td>${this.sanitizeDate(quote.arrivalDate)}</td></tr>
                    <tr><th>Package Type</th><td>${quote.isSuperPackage ? 'Super Package' : 'Standard Package'}</td></tr>
                    <tr><th>Transfer Included</th><td>${quote.transferIncluded ? 'Yes' : 'No'}</td></tr>
                </table>
            </div>
            
            <div class="quote-details">
                <h3>What's Included</h3>
                <div>${quote.whatsIncluded}</div>
                
                ${quote.activitiesIncluded ? `
                <h4>Activities Included</h4>
                <div>${quote.activitiesIncluded}</div>
                ` : ''}
            </div>
            
            <div class="price-highlight">
                Total Price: ${this.sanitizeCurrency(quote.totalPrice, quote.currency)}
            </div>
            
            <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_BASE_URL}/booking/interest?token=${trackingToken}" class="cta-button">
                    I'd like to book this package
                </a>
            </div>
            
            <p>If you have any questions or would like to make changes to this quote, please don't hesitate to contact us.</p>
            
            <p>We look forward to helping you create unforgettable memories!</p>
            
            <p>Best regards,<br>
            The ${companyInfo.name} Team</p>
        </div>
        
        <div class="footer">
            <p><strong>${companyInfo.name}</strong></p>
            <p>Email: ${companyInfo.email} | Phone: ${companyInfo.phone}</p>
            <p>Website: <a href="${companyInfo.website}">${companyInfo.website}</a></p>
            <p><small>This email was sent regarding your enquiry. If you did not request this quote, please ignore this email.</small></p>
        </div>
    </div>
</body>
</html>`;

    return emailHTML;
  }

  /**
   * Generate secure tracking token that doesn't expose sensitive data
   */
  static generateSecureTrackingToken(quoteId: string): string {
    // Create a hash-based token that doesn't expose the actual quote ID
    const crypto = require('crypto');
    const secret = process.env.QUOTE_TRACKING_SECRET || 'default-secret-change-in-production';
    const timestamp = Date.now().toString();
    
    // Create HMAC with quote ID and timestamp
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${quoteId}:${timestamp}`);
    const signature = hmac.digest('hex').substring(0, 16);
    
    // Encode the token (timestamp + signature, no quote ID)
    return Buffer.from(`${timestamp}:${signature}`).toString('base64url');
  }

  /**
   * Verify and decode secure tracking token
   */
  static verifyTrackingToken(token: string, quoteId: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64url').toString();
      const [timestamp, signature] = decoded.split(':');
      
      if (!timestamp || !signature) {
        return false;
      }

      // Check if token is not too old (24 hours)
      const tokenAge = Date.now() - parseInt(timestamp);
      if (tokenAge > 24 * 60 * 60 * 1000) {
        return false;
      }

      // Verify signature
      const crypto = require('crypto');
      const secret = process.env.QUOTE_TRACKING_SECRET || 'default-secret-change-in-production';
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(`${quoteId}:${timestamp}`);
      const expectedSignature = hmac.digest('hex').substring(0, 16);
      
      return signature === expectedSignature;
    } catch {
      return false;
    }
  }

  /**
   * Generate secure email subject
   */
  static generateSecureSubject(leadName: string, companyName: string): string {
    const safeLead = this.sanitizeText(leadName);
    const safeCompany = this.sanitizeText(companyName);
    
    return `Your Holiday Quote from ${safeCompany} - ${safeLead}`;
  }

  /**
   * Validate email template before sending
   */
  static validateEmailTemplate(html: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for potential XSS vectors
    if (html.includes('<script')) {
      errors.push('Script tags are not allowed in email templates');
    }

    if (html.includes('javascript:')) {
      errors.push('JavaScript protocols are not allowed');
    }

    if (html.includes('data:')) {
      warnings.push('Data URLs detected - ensure they are safe');
    }

    // Check for required elements
    if (!html.includes('<!DOCTYPE html>')) {
      warnings.push('Missing DOCTYPE declaration');
    }

    if (!html.includes('<meta charset="UTF-8">')) {
      warnings.push('Missing charset declaration');
    }

    // Check email size (should be under 100KB for good deliverability)
    if (html.length > 100000) {
      warnings.push('Email template is very large (>100KB) - may affect deliverability');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}