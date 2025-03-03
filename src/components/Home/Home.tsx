import React, { useState } from "react";

import "./Home.css";

import SettingsPanel from "../SettingsPanel/SettingsPanel";
import ErrorModal from "../ErrorModal/ErrorModal";
import SplicePlotWrapper from "../SplicePlot/SplicePlotWrapper";

import { parseBed, BedFile, BedData, Transcriptome } from 'sparrowgenomelib';

export interface FaiLine {
    seqid: string;
    seq_length: number;
    offset: number;
    lineBases: number;
    lineBytes: number;
}
export class FaiData {
    private data: FaiLine[];

    constructor() {
        this.data = [];
    }

    public addLine(line: FaiLine): void {
        this.data.push(line);
    }

    public get length(): number {
        return this.data.length;
    }

    public numEntries(): number {
        return this.data.length;
    }

    public getData(): FaiLine[] {
        return this.data;
    }
}

export function parseFai(faiFileName: File): Promise<FaiFile> {
    return new Promise((resolve, reject) => {
        const faiFile: FaiFile = {
            data: new FaiData(),
            fileName: faiFileName.name,
            status: 1,
        };
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result as string;
                const lines = result.split('\n');
                lines.forEach((line) => {
                    // skip empty lines
                    if (line.trim() === '') {
                        return;
                    }
                    const fields = line.split('\t');
                    if (fields.length === 6) {
                        const [seqid, seq_length, offset, lineBases, lineBytes] = fields;
                        const faiLine: FaiLine = {
                            seqid: seqid,
                            seq_length: parseInt(seq_length),
                            offset: parseInt(offset),
                            lineBases: parseInt(lineBases),
                            lineBytes: parseInt(lineBytes),
                        };
                        faiFile.data.addLine(faiLine);
                    } else {
                        throw new Error(`Invalid line format: ${line}`);
                    }
                });
                resolve(faiFile);
            } catch (error) {
                reject(new Error('Failed to parse Fasta Index file'));
            }
        };
        reader.onerror = () => {
            reject(new Error('Failed to read the file'));
        };
        reader.readAsText(faiFileName);
    });
}

export interface FaiFile {
    data: FaiData;
    fileName: string;
    status: 1 | 0 | -1; // valid | parsing | error
}

export interface IntegrationsLine {
    seqid1: string;
    seqid2: string;
    position1: number;
    position2: number;
    score: number;
    junction1?: string;
    junction2?: string;
    gene1?: string;
}
export class IntegrationsData {
    private data: IntegrationsLine[];

    constructor() {
        this.data = [];
    }

    public addLine(line: IntegrationsLine): void {
        this.data.push(line);
    }

    public get length(): number {
        return this.data.length;
    }

    public numEntries(): number {
        return this.data.length;
    }

    public getData(): IntegrationsLine[] {
        return this.data;
    }
}

export function parseIntegrations(integrationsFileName: File): Promise<IntegrationsFile> {
    return new Promise((resolve, reject) => {
        const integrationsFile: IntegrationsFile = {
            data: new IntegrationsData(),
            fileName: integrationsFileName.name,
            status: 1,
        };
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result as string;
                const lines = result.split('\n');
                lines.forEach((line) => {
                    // skip empty lines
                    if (line.trim() === '') {
                        return;
                    }
                    const fields = line.split('\t');
                    if (fields.length === 6) {
                        const [seqid1, position1, seqid2, position2, score, junction1, junction2, gene1] = fields;

                        const integrationsLine: IntegrationsLine = {
                            seqid1: seqid1,
                            position1: parseInt(position1),
                            seqid2: seqid2,
                            position2: parseInt(position2),
                            score: parseInt(score),
                        };

                        // Add optional fields if they exist
                        if (junction1) integrationsLine.junction1 = junction1;
                        if (junction2) integrationsLine.junction2 = junction2;
                        if (gene1) integrationsLine.gene1 = gene1;

                        integrationsFile.data.addLine(integrationsLine);
                    } else {
                        throw new Error(`Invalid line format: ${line}`);
                    }
                });
                resolve(integrationsFile);
            } catch (error) {
                reject(new Error('Failed to parse Integrations file'));
            }
        };
        reader.onerror = () => {
            reject(new Error('Failed to read the file'));
        };
        reader.readAsText(integrationsFileName);
    });
}

export interface IntegrationsFile {
    data: IntegrationsData;
    fileName: string;
    status: 1 | 0 | -1; // valid | parsing | error
}

const Home: React.FC = () => {
    const [transcriptome, setTranscriptome] = useState<Transcriptome>(new Transcriptome());
    const [fontSize, setFontSize] = useState<number>(10);
    const [width, setWidth] = useState<number>(1100);
    const [height, setHeight] = useState<number>(700);
    const [densities, setDensities] = useState<{
        data: BedData;
        fileName: string;
        status: number;
    }>({data: new BedData(), fileName: "", status: 0});
    const [fai, setFai] = useState<{
        data: FaiData;
        fileName: string;
        status: number;
    }>({data: new FaiData(), fileName: "", status: 0});
    const [integrations, setIntegrations] = useState<{
        data: IntegrationsData;
        fileName: string;
        status: number;
    }>({data: new IntegrationsData(), fileName: "", status: 0});
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handlePathogenGtfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const txdata = await Transcriptome.create(file);
                setTranscriptome(txdata);
            } catch (error) {
                setTranscriptome(new Transcriptome());
                setErrorMessage("Unable to parse the file. Please make sure the file is in GTF format. Try to run gffread -T to prepare your file.");
                setErrorModalVisible(true);
            }
        }
    };

    const handleDensityFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const bed_data: BedFile = await parseBed(file);
                setDensities(prevBedFiles => ({
                    ...prevBedFiles,
                    data: bed_data.data,
                    fileName: file.name,
                    status: 1
                }));
            } catch (error) {
                setDensities(prevBedFiles => ({
                    ...prevBedFiles,
                    data: new BedData(),
                    fileName: "",
                    status: -1
                }));
                setErrorMessage("Unable to parse the file. Please make sure the file is in BED format.");
                setErrorModalVisible(true);
            }
        }
    };

    const handleFaiUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const faiFile: FaiFile = await parseFai(file);
                setFai({
                    data: faiFile.data,
                    fileName: file.name,
                    status: 1
                });
            } catch (error) {
                setFai({
                    data: new FaiData(),
                    fileName: "",
                    status: -1
                });
                setErrorMessage("Unable to parse the file. Please make sure the file is in Fasta Index format.");
                setErrorModalVisible(true);
            }
        }
    };

    const handleIntegrationsUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const integrationsFile: IntegrationsFile = await parseIntegrations(file);
                setIntegrations({
                    data: integrationsFile.data,
                    fileName: file.name,
                    status: 1
                });
            } catch (error) {
                setIntegrations({
                    data: new IntegrationsData(),
                    fileName: "",
                    status: -1
                });
                setErrorMessage("Unable to parse the file. Please make sure the file is in Integrations format.");
                setErrorModalVisible(true);
            }
        }
    };

    const closeErrorModal = () => {
        setErrorModalVisible(false);
    };

    return (
        <div className="splicemap-plot">
            <SettingsPanel
                pathogenGtfStatus={1}
                onPathogenGTFUpload={handlePathogenGtfUpload}
                densityStatus={densities.status}
                onDensityUpload={handleDensityFileUpload}
                faiStatus={fai.status}
                onFaiUpload={handleFaiUpload}
                integrationsStatus={integrations.status}
                onIntegrationsUpload={handleIntegrationsUpload}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                width={width}
                onWidthChange={setWidth}
                height={height}
                onHeightChange={setHeight}
            />

            {/* <div className="visualization-container">
                <SplicePlotWrapper
                    transcriptome={transcriptome}
                    bedFiles={bedFiles}
                    zoomWidth={zoomWidth}
                    zoomWindowWidth={zoomWindowWidth}
                    width={width}
                    height={height}
                    fontSize={fontSize}
                />
            </div> */}

            <ErrorModal
                visible={errorModalVisible}
                message={errorMessage}
                onClose={closeErrorModal}
            />
        </div>
    );
};

export default Home;
