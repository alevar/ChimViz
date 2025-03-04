import * as d3 from "d3";
import { 
    Dimensions,
    BedData,
    FaiData,
    D3Grid,
    GridConfig
} from 'sparrowgenomelib';

interface IdiogramPlotData {
    dimensions: Dimensions;
    densities: {
        data: BedData;
    };
    fai: {
        data: FaiData;
    }
    colorScale?: d3.ScaleSequential<string>;
}

export class IdiogramPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private dimensions: Dimensions;
    private colorScale: d3.ScaleSequential<string>;
    private densities: BedData;
    private fai: FaiData;
    private grid: D3Grid;
    private fontSize: number;
    
    constructor(
        svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        data: IdiogramPlotData
    ) {
        this.svg = svg;
        this.dimensions = data.dimensions;
        this.colorScale = data.colorScale ?? d3.scaleSequential(d3.interpolateViridis).domain([0, 1]);
        this.densities = data.densities.data;
        this.fai = data.fai.data;
        
        // Extract fontSize, with a default if not provided
        this.fontSize = data.dimensions.fontSize ?? 12;

        // Get sequence lengths
        const faiData = this.fai.getData();
        const seqLengths = faiData.map(d => d.seq_length);

        // Calculate column ratios based on seq_lengths
        const totalLength = d3.sum(seqLengths);
        const columnRatios = seqLengths.map(length => length / totalLength);

        const gridConfig: GridConfig = {
            columns: this.fai.length,
            columnRatios,
            rowRatiosPerColumn: Array(this.fai.length).fill([1.0]), // Assuming one row per column
        };
        
        this.grid = new D3Grid(this.svg, this.dimensions['height'], this.dimensions['width'], gridConfig);
    }

    /**
     * Organizes density data by chromosome and position
     * @returns Map of chromosomes to their density chunks
     */
    private organizeDensityData(): Map<string, Array<{start: number; end: number; score: number}>> {
        const densityMap = new Map<string, Array<{start: number; end: number; score: number}>>();
        
        // Group density data by chromosome
        const bedData = this.densities.getData();
        
        bedData.forEach(entry => {
            if (!densityMap.has(entry.seqid)) {
                densityMap.set(entry.seqid, []);
            }
            
            densityMap.get(entry.seqid)!.push({
                start: entry.start,
                end: entry.end,
                score: entry.score
            });
        });
        
        // Sort entries by start position for each chromosome
        densityMap.forEach(entries => {
            entries.sort((a, b) => a.start - b.start);
        });
        
        return densityMap;
    }

    /**
     * Creates a density heatmap for a chromosome using SVG gradient
     * @param cellSvg SVG element for the cell
     * @param seqid Chromosome ID
     * @param length Chromosome length
     * @param densityEntries Density data for this chromosome
     * @returns ID of the gradient
     */
    private createDensityHeatmap(
        cellSvg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        seqid: string,
        length: number,
        densityEntries: Array<{start: number; end: number; score: number}>,
    ): string {
        // Generate unique ID for the gradient
        const gradientId = `density-gradient-${seqid}`;
        
        // Create gradient definition
        const defs = cellSvg.append("defs");
        const gradient = defs.append("linearGradient")
            .attr("id", gradientId)
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "0%");
            
        // Handle case with no density data
        if (densityEntries.length === 0) {
            gradient.append("stop")
                .attr("offset", "0%")
                .attr("stop-color", "#f0f0f0") // Light gray for no data
                .attr("stop-opacity", 0.5);
                
            gradient.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", "#f0f0f0")
                .attr("stop-opacity", 0.5);
                
            return gradientId;
        }
        
        // Create gradient stops based on density chunks
        densityEntries.forEach(entry => {
            // Convert genomic positions to percentage along chromosome
            const startPercent = (entry.start / length) * 100;
            const endPercent = (entry.end / length) * 100;
            
            // Add a stop at the beginning of the segment
            gradient.append("stop")
                .attr("offset", `${startPercent}%`)
                .attr("stop-color", this.colorScale(entry.score));
                
            // Add a stop at the end of the segment (to maintain color until the next segment)
            gradient.append("stop")
                .attr("offset", `${endPercent}%`)
                .attr("stop-color", this.colorScale(entry.score));
        });
        
        return gradientId;
    }

    public plot(): void {
        // Get density data organized by chromosome
        const densityByChromosome = this.organizeDensityData();
        
        // Calculate global min/max scores for color scale normalization
        let minScore = Infinity;
        let maxScore = -Infinity;
        
        densityByChromosome.forEach(entries => {
            entries.forEach(entry => {
                minScore = Math.min(minScore, entry.score);
                maxScore = Math.max(maxScore, entry.score);
            });
        });
        
        // If we found valid scores, update color scale domain
        if (minScore !== Infinity && maxScore !== -Infinity) {
            this.colorScale.domain([minScore, maxScore]);
        } else {
            // Default domain if no data
            this.colorScale.domain([0, 1]);
        }
        
        // Build a colored rectangle for each chromosome on the grid
        const faiData = this.fai.getData();
        faiData.forEach((line, index) => {
            const cellSvg = this.grid.getCellSvg(index, 0);
            if (cellSvg) {
                const dimensions = this.grid.getCellDimensions(index, 0);
                const cellWidth = dimensions?.width || 0;
                const cellHeight = dimensions?.height || 0;
                
                // Get density data for this chromosome
                const chromosomeDensities = densityByChromosome.get(line.seqid) || [];
                
                // Create density heatmap gradient
                const gradientId = this.createDensityHeatmap(
                    cellSvg,
                    line.seqid,
                    line.seq_length,
                    chromosomeDensities,
                );
                
                // Draw chromosome rectangle with gradient fill
                cellSvg.append("rect")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", cellWidth)
                    .attr("height", cellHeight)
                    .attr("rx", 8)  // Rounded corners
                    .attr("ry", 8)
                    .style("fill", `url(#${gradientId})`)
                    .style("stroke", "white")
                    .style("stroke-width", "1px");
                
                // Add chromosome label with explicit fontSize
                cellSvg.append("text")
                    .attr("x", cellWidth / 2)
                    .attr("y", cellHeight / 2)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                    .style("font-size", `${this.fontSize}px`)  // Use explicit fontSize property
                    .style("fill", "white")
                    .text(line.seqid);
            }
        });
    }
}