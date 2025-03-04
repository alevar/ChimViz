import * as d3 from 'd3';
import { FaiData, IntegrationsData } from 'sparrowgenomelib';

/**
 * Utility class containing shared methods for visualization components
 */
export class PlotUtilities {
  /**
   * Calculate color based on pathogen position (normalized from 0-1)
   * @param normalizedPosition - Position normalized between 0 and 1
   * @returns A color string in hex or rgb format
   */
  public static getColorFromPosition(normalizedPosition: number): string {
    // Use d3's built-in interpolation to create a color scale
    const colorScale = d3.scaleSequential(d3.interpolateRainbow)
      .domain([0, 1]);
    
    return colorScale(normalizedPosition);
  }

  /**
   * Calculate normalized position within the pathogen genome
   * @param seqid - Sequence ID
   * @param position - Position within the sequence
   * @param pathFaiData - Pathogen FAI data
   * @returns Normalized position (0-1) across the entire genome
   */
  public static calculateNormalizedPosition(
    seqid: string, 
    position: number, 
    pathFaiData: FaiData
  ): number {
    const pathData = pathFaiData.getData();
    
    // Calculate total genome length
    const totalPathLength = pathData.reduce((sum, entry) => sum + entry.seq_length, 0);
    
    // Calculate accumulated length before this sequence
    let accumulatedLength = 0;
    for (const entry of pathData) {
      if (entry.seqid === seqid) {
        // Found the correct sequence, add position to accumulated length
        return (accumulatedLength + position) / totalPathLength;
      }
      accumulatedLength += entry.seq_length;
    }
    
    // Default return if sequence not found
    return 0;
  }

  /**
   * Calculate normalized positions for all integrations
   * @param integrations - Integration data
   * @param pathFaiData - Pathogen FAI data
   * @returns Map of integration indices to normalized positions
   */
  public static calculateAllNormalizedPositions(
    integrations: IntegrationsData,
    pathFaiData: FaiData
  ): Map<number, number> {
    const normalizedPositions = new Map<number, number>();
    const integrationsData = integrations.getData();
    
    integrationsData.forEach((integration, index) => {
      const normalizedPos = this.calculateNormalizedPosition(
        integration.seqid2, 
        integration.position2, 
        pathFaiData
      );
      normalizedPositions.set(index, normalizedPos);
    });
    
    return normalizedPositions;
  }
}