import * as d3 from 'd3';
import { Dimensions, IntegrationsFile, IntegrationsData, IntegrationsLine, FaiFile, FaiData, FaiLine } from 'sparrowgenomelib';
import { PlotUtilities } from './PlotUtilities';

interface ConnectorPlotData {
  dimensions: Dimensions;
  integrations: IntegrationsFile;
  hostFai: FaiFile;
  pathFai: FaiFile;
}

export class ConnectorPlot {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private dimensions: Dimensions;
  private integrations: IntegrationsData;
  private hostFai: FaiData;
  private pathFai: FaiData;

  constructor(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    data: ConnectorPlotData) {
    this.svg = svg;
    this.dimensions = data.dimensions;
    this.integrations = data.integrations.data;
    this.hostFai = data.hostFai.data;
    this.pathFai = data.pathFai.data;
  }

  private calculateCurvePoints(point1: { x: number; y: number; }, point2: { x: number; y: number; }): string {
    // Generate a smooth curve using intermediate points
    const curve = d3.line<{ x: number; y: number }>()
      .x(d => d.x)
      .y(d => d.y)
      .curve(d3.curveBasis);

    const intermediatePoints = [
      { x: point1.x, y: point1.y },
      { x: point1.x, y: point1.y + (point2.y - point1.y) / 5 },
      { x: point1.x + (point2.x - point1.x) / 2, y: point1.y + (point2.y - point1.y) / 2 },
      { x: point2.x, y: point2.y - (point2.y - point1.y) / 5 },
      { x: point2.x, y: point2.y },
    ];

    return curve(intermediatePoints) || '';
  }

  private drawConnection(
    point1: { x: number; y: number }, 
    point2: { x: number; y: number }, 
    score: number, 
    maxScore: number,
    normalizedPathPosition: number
  ) {
    // Use shared utility method for color generation
    const color = PlotUtilities.getColorFromPosition(normalizedPathPosition);
    
    // Calculate opacity based on score (normalize to range 0.2-0.9)
    const opacity = 0.2 + (score / maxScore * 0.7);
    
    // Draw a curved line between point1 and point2 with color and opacity
    this.svg.append('path')
      .attr('d', this.calculateCurvePoints(point1, point2))
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('opacity', opacity);
  }

  public plot(): void {
    const hostFaiData = this.hostFai.getData();
    const pathFaiData = this.pathFai.getData();
    const integrationsLines = this.integrations.getData();
    
    console.log(integrationsLines);
    
    // Find maximum score for normalization
    const maxScore = Math.max(...integrationsLines.map(integration => integration.score || 0));
    
    // Create mapping functions to convert positions to plot coordinates
    const mapHostPositionToCoord = (seqid: string, position: number) => {
      const hostEntry = hostFaiData.find(line => line.seqid === seqid);
      if (!hostEntry) return null;
      const x = (position / hostEntry.seq_length) * this.dimensions.width; // Scale position to width
      const y = 0; // Arbitrary y-coordinate for host positions
      return { x, y };
    };

    const mapPathPositionToCoord = (seqid: string, position: number) => {
      const pathEntry = pathFaiData.find(line => line.seqid === seqid);
      if (!pathEntry) return null;
      const x = (position / pathEntry.seq_length) * this.dimensions.width; // Scale position to width
      const y = this.dimensions.height; // Arbitrary y-coordinate for pathogen positions
      return { x, y };
    };

    // Pre-calculate all normalized positions
    const normalizedPositions = PlotUtilities.calculateAllNormalizedPositions(
      this.integrations,
      this.pathFai
    );

    // Iterate over integrations and draw connections
    integrationsLines.forEach((integration, index) => {
      const hostCoord = mapHostPositionToCoord(integration.seqid1, integration.position1);
      const pathCoord = mapPathPositionToCoord(integration.seqid2, integration.position2);
      
      console.log(integration);
      console.log(hostCoord);
      console.log(pathCoord);
      
      if (hostCoord && pathCoord) {
        // Get pre-calculated normalized position
        const normalizedPosition = normalizedPositions.get(index) || 0;
        
        console.log(`Drawing connection from ${integration.seqid1}:${integration.position1} to ${integration.seqid2}:${integration.position2}`);
        this.drawConnection(
          hostCoord, 
          pathCoord, 
          integration.score || 0, 
          maxScore,
          normalizedPosition
        );
      }
    });
  }
}