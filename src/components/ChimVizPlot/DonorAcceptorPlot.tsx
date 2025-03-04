import * as d3 from 'd3';
import { FaiData } from 'sparrowgenomelib';
import { Transcriptome } from 'sparrowgenomelib';
import { Interval, computeMidpoint } from 'sparrowgenomelib';
import { 
    Dimensions
} from 'sparrowgenomelib';

export function adjustIntervals(intervals: Interval[], start: number, end: number, separator: number): Interval[] {
    if (intervals.length <= 1) {
        return intervals;
    }

    // Sort intervals by their start position
    intervals.sort((a, b) => a[0] - b[0]);

    const totalIntervals = intervals.length;
    const totalSpace = end - start;
    const totalIntervalWidth = intervals.reduce((acc, interval) => acc + ((interval[1] - interval[0]) + separator), 0); // separator is added here to account for the space between intervals
    const emptyScaleFactor = (totalSpace - totalIntervalWidth) / totalSpace; // total fraction of space that is not occupied by intervals

    // compute intervals between interval median points
    let negativeIntervals = [[0,0]];
    for (let i = 0; i < totalIntervals; i++) {
        const midpoint = computeMidpoint(intervals[i][0], intervals[i][1]);
        negativeIntervals[negativeIntervals.length - 1][1] = midpoint;
        negativeIntervals.push([midpoint,end]);
    }

    // compute scaled width of spacers
    let scaledSpacerWidths = [];
    for (let i = 0; i < negativeIntervals.length; i++) {
        const interval = negativeIntervals[i];
        const intervalWidth = (interval[1] - interval[0])-separator;
        const scaledWidth = intervalWidth * emptyScaleFactor;
        scaledSpacerWidths.push(scaledWidth);
    }

    // compute positions of original intervals separated by scaled spacers
    let new_intervals: Interval[] = [];
    let prev_end = start;
    for (let i = 0; i < totalIntervals; i++) {
        const interval = intervals[i];
        const intervalWidth = (interval[1] - interval[0]);
        const spacer = scaledSpacerWidths[i]+separator;
        const newInterval: Interval = [prev_end+spacer, prev_end + spacer + intervalWidth];
        prev_end = newInterval[1];
        new_intervals.push(newInterval);
    }
    
    return new_intervals;
}

interface DonorAcceptorPlotData {
    dimensions: Dimensions;
    fai: {
        data: FaiData;
    };
    gtf_data: Transcriptome;
    spread: number;
    direction: string;
}

export class DonorAcceptorPlot {
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private dimensions: Dimensions;
    private genome_length: number;
    private gtf_data: Transcriptome;
    private spread: number;
    private direction: string = 'bottom-up'; // Default direction

    private components: Array<{ type: string; start: number; name: string }> = [];
    private spread_xs: Interval[] = [];
    private raw_xs: Interval[] = [];

    constructor(
            svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
            data: DonorAcceptorPlotData
        ) {
        this.svg = svg;
        this.dimensions = data.dimensions;
        this.genome_length = data.fai.data.getData()[0]?.seq_length || 0; // Assuming you're working with the first FAI entry
        this.gtf_data = data.gtf_data;
        this.spread = data.spread;
        this.direction = data.direction;

        // Construct x transformations
        const char_width = this.dimensions["fontSize"] / 1.25;

        // Loop over genome components in GTF data and extract donor/acceptor information
        //collect donors and acceptors
        this.components = [];
        for (const donor of this.gtf_data.donors()) {
            this.components.push({
                type: "donor",
                start: donor,
                name: donor.toString(),
            });
        }
        for (const acceptor of this.gtf_data.acceptors()) {
            this.components.push({
                type: "acceptor",
                start: acceptor,
                name: acceptor.toString(),
            });
        }
        console.log("components",this.components);
        // Sort components by start position
        this.components.sort((a, b) => a.start - b.start);
        console.log("sorted components",this.components);
        this.components.forEach((component) => {
            if (component.type !== "donor" && component.type !== "acceptor") return;

            const percent_position = (component.start / this.genome_length) * this.dimensions["width"];
            const label_width = component.name.length * char_width;
            const interval_start = percent_position - label_width / 2;
            const interval_end = percent_position + label_width / 2;

            this.raw_xs.push([interval_start, interval_end]);
        });
        console.log("raw_xs",this.raw_xs);

        // Apply spread transformation
        this.spread_xs = adjustIntervals(this.raw_xs, 1, this.dimensions["width"], this.spread);
        console.log("spread_xs",this.spread_xs);
    }

    public plot(): void {
        let da_i = 0;
        console.log("plotting components", this.components);
        console.log("plotting raw_xs", this.raw_xs);
        console.log("plotting spread_xs", this.spread_xs);
        for (const component of this.components) {
            if (component.type !== "donor" && component.type !== "acceptor") continue;

            const da_position = this.spread_xs[da_i];
            const da_x = computeMidpoint(da_position[0], da_position[1]);
            const raw_da_x = computeMidpoint(this.raw_xs[da_i][0], this.raw_xs[da_i][1]);
            const da_color = component.type === "donor" ? "#F78154" : "#5FAD56";

            // Set label Y position
            const da_label_y = this.direction === 'bottom-up'
                ? this.dimensions["y"] + this.dimensions["height"] - this.dimensions["fontSize"]
                : this.dimensions["y"] + this.dimensions["fontSize"];

            // Add label to SVG
            this.svg.append('text')
                .attr('x', da_x)
                .attr('y', da_label_y)
                .attr('text-anchor', 'middle')
                .style('fill', da_color)
                .style('font-size', `${this.dimensions["fontSize"]}px`)
                .text(component.name);

            // Draw connecting lines for donor/acceptor
            const line_segment_xshift = (this.dimensions["height"] - this.dimensions["fontSize"] * 2) / 3;
            const ys = this.direction === 'bottom-up'
                ? [
                    this.dimensions["y"],
                    this.dimensions["y"] + line_segment_xshift,
                    this.dimensions["y"] + (line_segment_xshift * 2),
                    this.dimensions["y"] + (line_segment_xshift * 3)
                ]
                : [
                    this.dimensions["height"] - this.dimensions["y"],
                    this.dimensions["height"] - this.dimensions["y"] - line_segment_xshift,
                    this.dimensions["height"] - this.dimensions["y"] - (line_segment_xshift * 2),
                    this.dimensions["height"] - this.dimensions["y"] - (line_segment_xshift * 3)
                ];

            const xs = [raw_da_x, raw_da_x, da_x, da_x];

            // Draw the lines
            this.svg.append('line')
                .attr('x1', xs[0])
                .attr('y1', ys[0])
                .attr('x2', xs[1])
                .attr('y2', ys[1])
                .style('stroke', da_color)
                .style('stroke-width', 1);

            this.svg.append('line')
                .attr('x1', xs[1])
                .attr('y1', ys[1])
                .attr('x2', xs[2])
                .attr('y2', ys[2])
                .style('stroke', da_color)
                .style('stroke-width', 1);

            this.svg.append('line')
                .attr('x1', xs[2])
                .attr('y1', ys[2])
                .attr('x2', xs[3])
                .attr('y2', ys[3])
                .style('stroke', da_color)
                .style('stroke-width', 1);

            da_i += 1;
        }
    }
}
