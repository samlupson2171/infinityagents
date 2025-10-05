import * as XLSX from 'xlsx';
import { ExcelLayoutDetector, DetectionResult, PricingSection, InclusionsSection } from './excel-layout-detector';
import { ExcelContentClassifier } from './excel-content-classifier';
import { ExcelMetadataExtractor, ResortMetadata } from './excel-metadata-extractor';

/**
 * Complete analysis result for an Excel file
 */
export interface ExcelAnalysisResult {
  metadata: ResortMetadata;
  layoutDetection: DetectionResult;
  pricingSection?: PricingSection;
  inclusionsSection?: InclusionsSection;
  recommendations: string[];
  confidence: number;
}

/**
 * Smart Excel Detector - Combines all detection systems for comprehensive analysis
 */
export class ExcelSmartDetector {
  private workbook: XLSX.WorkBook;
  private layoutDetector: ExcelLayoutDetector;
  private contentClassifier: ExcelContentClassifier;
  private metadataExtractor: ExcelMetadataExtractor;

  constructor(buffer: Buffer) {
    this.workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Use the first sheet for layout detection
    const firstSheetName = this.workbook.SheetNames[0];
    const firstWorksheet = this.workbook.Sheets[firstSheetName];
    
    this.layoutDetector = new ExcelLayoutDetector(firstWorksheet);
    this.contentClassifier = new ExcelContentClassifier();
    this.metadataExtractor = new ExcelMetadataExtractor(this.workbook);
  }

  /**
   * Perform complete analysis of the Excel file
   */
  analyzeExcelFile(): ExcelAnalysisResult {
    // Extract metadata
    const metadata = this.metadataExtractor.extractMetadata();
    
    // Detect layout patterns
    const layoutDetection = this.layoutDetector.detectLayout();
    
    // Find specific sections
    const pricingSection = this.layoutDetector.findPricingSection();
    const inclusionsSection = this.layoutDetector.findInclusionsSection();
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      metadata,
      layoutDetection,
      pricingSection,
      inclusionsSection
    );
    
    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(
      metadata,
      layoutDetection,
      pricingSection,
      inclusionsSection
    );

    return {
      metadata,
      layoutDetection,
      pricingSection,
      inclusionsSection,
      recommendations,
      confidence
    };
  }

  /**
   * Get a quick summary of the Excel file structure
   */
  getQuickSummary(): {
    resortName?: string;
    currency: string;
    layoutType: string;
    hasPricing: boolean;
    hasInclusions: boolean;
    confidence: number;
  } {
    const analysis = this.analyzeExcelFile();
    
    return {
      resortName: analysis.metadata.resortName,
      currency: analysis.metadata.currency,
      layoutType: analysis.layoutDetection.primaryLayout.type,
      hasPricing: !!analysis.pricingSection,
      hasInclusions: !!analysis.inclusionsSection,
      confidence: analysis.confidence
    };
  }

  /**
   * Check if the Excel file is suitable for automated processing
   */
  isProcessable(): {
    suitable: boolean;
    issues: string[];
    requirements: string[];
  } {
    const analysis = this.analyzeExcelFile();
    const issues: string[] = [];
    const requirements: string[] = [];

    // Check minimum requirements
    if (!analysis.pricingSection) {
      issues.push('No pricing section detected');
      requirements.push('Add a clear pricing table with months and prices');
    }

    if (!analysis.metadata.resortName) {
      issues.push('Resort name not detected');
      requirements.push('Include resort name in sheet name or cell content');
    }

    if (analysis.confidence < 0.5) {
      issues.push('Low confidence in structure detection');
      requirements.push('Ensure clear month names and pricing data formatting');
    }

    if (analysis.layoutDetection.primaryLayout.confidence < 0.6) {
      issues.push('Unclear layout structure');
      requirements.push('Use consistent formatting for months and pricing data');
    }

    return {
      suitable: issues.length === 0,
      issues,
      requirements
    };
  }

  /**
   * Generate processing recommendations
   */
  private generateRecommendations(
    metadata: ResortMetadata,
    layoutDetection: DetectionResult,
    pricingSection?: PricingSection,
    inclusionsSection?: InclusionsSection
  ): string[] {
    const recommendations: string[] = [];

    // Metadata recommendations
    if (metadata.confidence.resortName < 0.7) {
      recommendations.push('Consider adding a clear resort name in the sheet name or first few cells');
    }

    if (metadata.confidence.currency < 0.8) {
      recommendations.push('Ensure currency symbols are consistently used throughout pricing data');
    }

    // Layout recommendations
    if (layoutDetection.confidence < 0.7) {
      recommendations.push('Improve layout clarity by using consistent month names and pricing structure');
    }

    if (layoutDetection.primaryLayout.type === 'pricing-matrix' && layoutDetection.primaryLayout.confidence < 0.8) {
      recommendations.push('Consider adding clear month headers to improve layout detection');
    }

    // Pricing section recommendations
    if (!pricingSection) {
      recommendations.push('Add a clear pricing section with months and corresponding prices');
    } else if (pricingSection.accommodationTypes.length === 0) {
      recommendations.push('Include accommodation type information in headers or row labels');
    }

    // Inclusions recommendations
    if (!inclusionsSection) {
      recommendations.push('Add a package inclusions section to provide complete offer information');
    } else if (inclusionsSection.content.length < 3) {
      recommendations.push('Expand the inclusions list to provide more detailed package information');
    }

    // Special periods
    if (metadata.specialPeriods.length === 0) {
      recommendations.push('Consider adding special period information (Easter, Peak Season, etc.)');
    }

    return recommendations;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    metadata: ResortMetadata,
    layoutDetection: DetectionResult,
    pricingSection?: PricingSection,
    inclusionsSection?: InclusionsSection
  ): number {
    const weights = {
      metadata: 0.2,
      layout: 0.4,
      pricing: 0.3,
      inclusions: 0.1
    };

    let totalScore = 0;
    let totalWeight = 0;

    // Metadata confidence
    const metadataScore = (
      metadata.confidence.resortName +
      metadata.confidence.currency +
      metadata.confidence.dates
    ) / 3;
    totalScore += metadataScore * weights.metadata;
    totalWeight += weights.metadata;

    // Layout confidence
    totalScore += layoutDetection.confidence * weights.layout;
    totalWeight += weights.layout;

    // Pricing confidence
    if (pricingSection) {
      totalScore += 0.8 * weights.pricing; // Base score for having pricing section
    }
    totalWeight += weights.pricing;

    // Inclusions confidence
    if (inclusionsSection) {
      totalScore += 0.7 * weights.inclusions; // Base score for having inclusions section
    }
    totalWeight += weights.inclusions;

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }
}

/**
 * Convenience function to analyze an Excel buffer
 */
export function analyzeExcelBuffer(buffer: Buffer): ExcelAnalysisResult {
  const detector = new ExcelSmartDetector(buffer);
  return detector.analyzeExcelFile();
}

/**
 * Convenience function to check if Excel is processable
 */
export function isExcelProcessable(buffer: Buffer): {
  suitable: boolean;
  issues: string[];
  requirements: string[];
} {
  const detector = new ExcelSmartDetector(buffer);
  return detector.isProcessable();
}