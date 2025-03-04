import React, { useState, useEffect } from "react";

import "./Home.css";

import SettingsPanel from "../SettingsPanel/SettingsPanel";
import ErrorModal from "../ErrorModal/ErrorModal";
import ChimVizPlotWrapper from "../ChimVizPlot/ChimVizPlotWrapper";

import { parseFai, FaiFile, FaiData, parseIntegrations, IntegrationsFile, IntegrationsData, parseBed, BedFile, BedData, Transcriptome } from 'sparrowgenomelib';

interface TranscriptomeFile {
    data: Transcriptome;
    fileName: string;
    status: 1 | 0 | -1;
}

const Home: React.FC = () => {
    const [hasUpdatedTranscriptome, setHasUpdatedTranscriptome] = useState(false); // Track updates
    const [pathogenGTF, setPathogenGTF] = useState<TranscriptomeFile>({data: new Transcriptome(), fileName: "", status: 0});
    const [fontSize, setFontSize] = useState<number>(10);
    const [width, setWidth] = useState<number>(1100);
    const [height, setHeight] = useState<number>(700);
    const [densities, setDensities] = useState<BedFile>({data: new BedData(), fileName: "", status: 0});
    const [hostFai, setHostFai] = useState<FaiFile>({data: new FaiData(), fileName: "", status: 0});
    const [pathFai, setPathFai] = useState<FaiFile>({data: new FaiData(), fileName: "", status: 0});
    const [integrations, setIntegrations] = useState<IntegrationsFile>({data: new IntegrationsData(), fileName: "", status: 0});
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (pathogenGTF.status === 1 && pathFai.status === 1 && !hasUpdatedTranscriptome) {
            updateTranscriptomeWithFaiData();
            setHasUpdatedTranscriptome(true); // Mark as updated
        }
    }, [pathogenGTF.status, pathFai.status, hasUpdatedTranscriptome]);

    const updateTranscriptomeWithFaiData = () => {
        if (pathogenGTF.status !== 1 || pathFai.status !== 1) return;

        try {
            const currentTranscriptome = pathogenGTF.data;
            const seqId = currentTranscriptome.seqid;

            if (!seqId) return;

            const faiEntry = pathFai.data.getData().find(entry => entry.seqid === seqId);

            if (!faiEntry) {
                setErrorMessage(`Error: Could not find sequence '${seqId}' in the pathogen FAI file.`);
                setErrorModalVisible(true);
                return;
            }

            const updatedTranscriptome = Transcriptome.fromExisting(currentTranscriptome);
            updatedTranscriptome.start = 0;
            updatedTranscriptome.end = faiEntry.seq_length;


            console.log(pathogenGTF.data.start, pathogenGTF.data.end);
            console.log(faiEntry.seq_length);
            console.log(updatedTranscriptome.start, updatedTranscriptome.end);

            setPathogenGTF({
                ...pathogenGTF,
                data: updatedTranscriptome
            });
        } catch (error) {
            setErrorMessage("Error updating transcriptome with FAI data: " + (error instanceof Error ? error.message : String(error)));
            setErrorModalVisible(true);
        }
    };

    const handlePathogenGtfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                let txdata = await Transcriptome.create(file);
                setPathogenGTF({
                    data: txdata,
                    fileName: file.name,
                    status: 1
                });
                
                // If pathogen FAI is already loaded, update the transcriptome immediately
                if (pathFai.status === 1) {
                    setTimeout(() => updateTranscriptomeWithFaiData(), 0);
                }
            } catch (error) {
                setPathogenGTF({
                    data: new Transcriptome(),
                    fileName: "",
                    status: -1
                });
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

    const handleHostFaiUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const faiFile: FaiFile = await parseFai(file);
                setHostFai({
                    data: faiFile.data,
                    fileName: file.name,
                    status: 1
                });
            } catch (error) {
                setHostFai({
                    data: new FaiData(),
                    fileName: "",
                    status: -1
                });
                setErrorMessage("Unable to parse the file. Please make sure the file is in Fasta Index format.");
                setErrorModalVisible(true);
            }
        }
    };

    const handlePathFaiUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const faiFile: FaiFile = await parseFai(file);
                setPathFai({
                    data: faiFile.data,
                    fileName: file.name,
                    status: 1
                });
                
                // If pathogen GTF is already loaded, update the transcriptome immediately
                if (pathogenGTF.status === 1) {
                    setTimeout(() => updateTranscriptomeWithFaiData(), 0);
                }
            } catch (error) {
                setPathFai({
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
                pathogenGtfStatus={pathogenGTF.status}
                onPathogenGTFUpload={handlePathogenGtfUpload}
                densityStatus={densities.status}
                onDensityUpload={handleDensityFileUpload}
                hostFaiStatus={hostFai.status}
                onHostFaiUpload={handleHostFaiUpload}
                pathFaiStatus={pathFai.status}
                onPathFaiUpload={handlePathFaiUpload}
                integrationsStatus={integrations.status}
                onIntegrationsUpload={handleIntegrationsUpload}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                width={width}
                onWidthChange={setWidth}
                height={height}
                onHeightChange={setHeight}
            />

            <div className="visualization-container">
                <ChimVizPlotWrapper
                    pathogenGTF={pathogenGTF.data}
                    densities={densities}
                    hostFai={hostFai}
                    pathFai={pathFai}
                    integrations={integrations}
                    width={width}
                    height={height}
                    fontSize={fontSize}
                />
            </div>

            <ErrorModal
                visible={errorModalVisible}
                message={errorMessage}
                onClose={closeErrorModal}
            />
        </div>
    );
};

export default Home;