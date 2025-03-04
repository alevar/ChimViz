import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

import { FaiFile, IntegrationsFile, Transcriptome, BedFile } from 'sparrowgenomelib';

import { ChimVizPlot } from './ChimVizPlot';

interface ChimVizPlotWrapperProps {
    pathogenGTF: Transcriptome;
    densities: BedFile;
    hostFai: FaiFile;
    pathFai: FaiFile;
    integrations: IntegrationsFile;
    width: number;
    height: number;
    fontSize: number;
}

const ChimVizPlotWrapper: React.FC<ChimVizPlotWrapperProps> = ({ 
    pathogenGTF,
    densities,
    hostFai,
    pathFai,
    integrations,
    width, 
    height, 
    fontSize 
}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    const handleDownload = () => {
        if (svgRef.current) {
            const svgElement = svgRef.current;
            const svgString = new XMLSerializer().serializeToString(svgElement);
            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'chimviz_plot.svg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        
        const chimVizPlot = new ChimVizPlot(svg, { 
            pathogenGTF,
            densities,
            hostFai,
            pathFai,
            integrations,
            width, 
            height, 
            fontSize });
        chimVizPlot.plot();
    }, [pathogenGTF, densities, hostFai, pathFai, integrations, width, height, fontSize]);

    return (
        <div>
            <svg ref={svgRef}></svg>
            <button onClick={handleDownload}>Download SVG</button>
        </div>
    );
};

export default ChimVizPlotWrapper;
