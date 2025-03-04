import * as d3 from 'd3';

import {
    Transcriptome,
    FaiFile,
    FaiData,
    IntegrationsFile,
    IntegrationsData,
    BedFile,
    BedData,
    BedLine,
    D3Grid,
    GridConfig,
    ORFPlot,
} from 'sparrowgenomelib';

import { IdiogramPlot } from './IdiogramPlot';
import { ConnectorPlot } from './ConnectorPlot';
import { DonorAcceptorPlot } from './DonorAcceptorPlot';
import { PlotUtilities } from './PlotUtilities';

interface ChimVizPlotData {
    pathogenGTF: Transcriptome;
    densities: BedFile;
    hostFai: FaiFile;
    pathFai: FaiFile;
    integrations: IntegrationsFile;
    width: number;
    height: number;
    fontSize: number;
}

export class ChimVizPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private width: number;
    private height: number;
    private fontSize: number;
    private pathogenGTF: Transcriptome = new Transcriptome();
    private densities: BedFile = {
        data: new BedData(),
        fileName: "",
        status: 0,
    };
    private hostFai: FaiFile = {
        data: new FaiData(),
        fileName: "",
        status: 0,
    };
    private pathFai: FaiFile = {
        data: new FaiData(),
        fileName: "",
        status: 0,
    };
    private integrations: IntegrationsFile = {
        data: new IntegrationsData(),
        fileName: "",
        status: 0,
    };

    private gridConfig: GridConfig = {
        columns: 1,
        columnRatios: [1.0], // plot
        rowRatiosPerColumn: [
            [0.05, 0.5, 0.2, 0.05, 0.2], // ideogram, connectors, orf plot, genome plot, donor/acceptors
        ],
    };
    private grid: D3Grid;

    constructor(svgElement: d3.Selection<SVGSVGElement, unknown, null, undefined>,
        data: ChimVizPlotData) {

        this.width = data.width;
        this.height = data.height;
        this.fontSize = data.fontSize;

        this.pathogenGTF = data.pathogenGTF;
        this.densities = data.densities;
        this.hostFai = data.hostFai;
        this.pathFai = data.pathFai;
        this.integrations = data.integrations;

        this.svg = svgElement;

        this.grid = new D3Grid(this.svg, this.height, this.width, this.gridConfig);
    }

    public plot(): void {
        const idiogramPlotSvg = this.grid.getCellSvg(0, 0);
        if (idiogramPlotSvg) {
            const dimensions = this.grid.getCellDimensions(0, 0);

            const idiogramPlotDimensions = {
                width: dimensions?.width || 0,
                height: dimensions?.height || 0,
                x: 0,
                y: 0,
                fontSize: this.fontSize,
            };

            const idiogramPlot = new IdiogramPlot(idiogramPlotSvg, {
                dimensions: idiogramPlotDimensions,
                densities: this.densities,
                fai: this.hostFai,
            });

            this.grid.setCellData(0, 0, idiogramPlot);
            idiogramPlot.plot();
        }

        // build connectors
        const connectorPlotSvg = this.grid.getCellSvg(0, 1);
        if (connectorPlotSvg) {
            const dimensions = this.grid.getCellDimensions(0, 1);

            const connectorPlotDimensions = {
                width: dimensions?.width || 0,
                height: dimensions?.height || 0,
                x: 0,
                y: 0,
                fontSize: this.fontSize,
            };
            const connectorPlot = new ConnectorPlot(connectorPlotSvg, {
                dimensions: connectorPlotDimensions,
                integrations: this.integrations,
                hostFai: this.hostFai,
                pathFai: this.pathFai,
            });
            this.grid.setCellData(0, 1, connectorPlot);
            connectorPlot.plot();
        }

        const pathogenPlotSvg = this.grid.getCellSvg(0, 2);
        if (pathogenPlotSvg) {
            const dimensions = this.grid.getCellDimensions(0, 2);

            // No need to use cell coordinates since the SVG already has its position set
            const ORFPlotDimensions = {
                width: dimensions?.width || 0,
                height: dimensions?.height || 0,
                x: 0,
                y: 0,
                fontSize: this.fontSize,
            };

            const orfPlot = new ORFPlot(pathogenPlotSvg, {
                dimensions: ORFPlotDimensions,
                transcriptome: this.pathogenGTF
            });

            this.grid.setCellData(0, 2, orfPlot);
            orfPlot.plot();
        }

        const pathogenGenomePlotSvg = this.grid.getCellSvg(0, 3);
        if (pathogenGenomePlotSvg) {
            const dimensions = this.grid.getCellDimensions(0, 3);

            const pathogenGenomePlotDimensions = {
                width: dimensions?.width || 0,
                height: dimensions?.height || 0,
                x: 0,
                y: 0,
                fontSize: this.fontSize,
            };
            
            // draw rectangle with rounded corners over the entire cell
            pathogenGenomePlotSvg.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", dimensions?.width || 0)
                .attr("height", dimensions?.height || 0)
                .attr("rx", 8)  // Rounded corners
                .attr("ry", 8)
                .style("fill", "#eee")
                .style("stroke", "#333")
                .style("stroke-width", "1px");
        }

        // lastly we draw the donor/acceptor positions
        const donorAcceptorPlotSvg = this.grid.getCellSvg(0, 4);
        if (donorAcceptorPlotSvg) {
            const dimensions = this.grid.getCellDimensions(0, 4);
            const donorAcceptorPlotDimensions = {
                width: dimensions?.width || 0,
                height: dimensions?.height || 0,
                x: 0,
                y: 0,
                fontSize: this.fontSize,
            };

            const donorAcceptorPlot = new DonorAcceptorPlot(donorAcceptorPlotSvg, {
                dimensions: donorAcceptorPlotDimensions,
                fai: this.pathFai,
                gtf_data: this.pathogenGTF,
                spread: 5,  // Adjust the spread factor based on your data
                direction: 'bottom-up',  // or 'top-down' based on your requirement
            });

            this.grid.setCellData(0, 4, donorAcceptorPlot);
            donorAcceptorPlot.plot();
        }

        // lastly, we draw dotted lines over the orfplot and genome plot for where the integrations are
        const integrations_dashedLine_overlaySvg = this.grid.createOverlaySvg(0, [2, 3]);
        if (integrations_dashedLine_overlaySvg) {
            const dimensions = this.grid.getCellDimensions(0, 1);
            
            // Pre-calculate all normalized positions using shared utility
            const normalizedPositions = PlotUtilities.calculateAllNormalizedPositions(
                this.integrations.data,
                this.pathFai.data
            );

            const integration_data = this.integrations.data.getData();
            for (let i=0; i < this.integrations.data.length; i++) {
                const integration = integration_data[i];
                const integration_position = integration.position2 / this.pathogenGTF.getEnd() * (dimensions?.width || 0);
                
                // Use the shared color utility instead of a fixed color
                const normalizedPosition = normalizedPositions.get(i) || 0;
                const color = PlotUtilities.getColorFromPosition(normalizedPosition);
                
                integrations_dashedLine_overlaySvg.append("line")
                    .attr("x1", integration_position)
                    .attr("y1", 0)
                    .attr("x2", integration_position)
                    .attr("y2", dimensions?.height || 0)
                    .attr("stroke", color)  // Use the calculated color
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "5,5");
            }
        }
    }
}