import React, { useState } from "react";
import { Card, Form, OverlayTrigger, Tooltip } from "react-bootstrap";
import { InfoCircle } from "react-bootstrap-icons";
import "./SettingsPanel.css";

interface SettingsPanelProps {
    densityStatus: number;
    onDensityUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    hostFaiStatus: number;
    onHostFaiUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    pathFaiStatus: number;
    onPathFaiUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    pathogenGtfStatus: number;
    onPathogenGTFUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    integrationsStatus: number;
    onIntegrationsUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    fontSize: number;
    onFontSizeChange: (value: number) => void;
    width: number;
    onWidthChange: (value: number) => void;
    height: number;
    onHeightChange: (value: number) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    densityStatus,
    onDensityUpload,
    hostFaiStatus,
    onHostFaiUpload,
    pathFaiStatus,
    onPathFaiUpload,
    pathogenGtfStatus,
    onPathogenGTFUpload,
    integrationsStatus,
    onIntegrationsUpload,
    fontSize,
    onFontSizeChange,
    width,
    onWidthChange,
    height,
    onHeightChange,
}) => {
    // Help tooltip content for each file type
    const tooltips = {
        densities: (
            <Tooltip id="density-tooltip" className="tooltip-hover">
                <strong>Host Gene Density File Format Example (BED):</strong>
                <pre style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    {''}
                </pre>
                <div>BED file containing gene densities for each sequence identifier. Gene densities should be provided in the score column. Strand is ignored.</div>
            </Tooltip>
        ),
        host_fai: (
            <Tooltip id="fai-tooltip" className="tooltip-hover">
                <strong>Fasta Index (FAI) File Format Example:</strong>
                <pre style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    {'chr1\t248956422\t6\t50\t51\n' +
                     'chr10\t133797422\t253935564\t50\t51\n' +
                     'chr11\t135086622\t390408942\t50\t51'}
                </pre>
                <div>Fasta index file.</div>
            </Tooltip>
        ),
        path_fai: (
            <Tooltip id="fai-tooltip" className="tooltip-hover">
                <strong>Fasta Index (FAI) File Format Example:</strong>
                <pre style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    {'chr1\t248956422\t6\t50\t51\n' +
                     'chr10\t133797422\t253935564\t50\t51\n' +
                     'chr11\t135086622\t390408942\t50\t51'}
                </pre>
                <div>Fasta index file.</div>
            </Tooltip>
        ),
        path_gtf: (
            <Tooltip id="gtf-tooltip" className="tooltip-hover">
                <strong>GTF File Format Example:</strong>
                <pre style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    {'chr1\tVIRUS\texon\t1000\t1200\t.\t+\t.\tgene_id "gene1"; transcript_id "transcript1";\n' +
                        'chr1\tVIRUS\tCDS\t1050\t1150\t.\t+\t0\tgene_id "gene1"; transcript_id "transcript1";'}
                </pre>
                <div>GTF files contain gene annotations with 9 tab-separated columns.</div>
            </Tooltip>
        ),
        integrations: (
            <Tooltip id="integrations-tooltip" className="tooltip-hover">
                <strong>Integration Sites File Format Example:</strong>
                <pre style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    {'genome1_seqid\tgenome2_seqid\tgenome1_breakpoint\tgenome2_breakpoint\tcount\tjunction1\tjunction2\tgene1'}
                </pre>
                <div>File describing integration events between two genomes.</div>
            </Tooltip>
        ),
    };

    // Helper component for upload fields with help tooltip that stays visible on hover
    const UploadFieldWithHelp = ({
        id,
        label,
        onChange,
        errorStatus,
        errorMessage,
        tooltipContent
    }: {
        id: string;
        label: string;
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
        errorStatus?: number;
        errorMessage?: string;
        tooltipContent: JSX.Element;
    }) => {
        const [show, setShow] = useState(false);

        return (
            <Form.Group controlId={id} className="mb-3">
                <OverlayTrigger
                    placement="right"
                    show={show}
                    onToggle={setShow}
                    trigger={["click"]}
                    rootClose
                    rootCloseEvent="mousedown"
                    overlay={tooltipContent}
                >
                    <span
                        className="ms-2"
                        style={{ cursor: 'help' }}
                        onClick={() => setShow(!show)} // Toggle on click too
                    >
                        <InfoCircle size={16} />
                    </span>
                </OverlayTrigger>
                <Form.Label className="d-flex align-items-center">
                    {label}
                </Form.Label>
                <Form.Control type="file" onChange={onChange} />
                {errorStatus === -1 && (
                    <div className="text-danger">{errorMessage}</div>
                )}
            </Form.Group>
        );
    };

    return (
        <div className="settings-panel">
            <Card className="settings-card">
                <Card.Body className="settings-body">
                    <Card.Title className="settings-title">Settings</Card.Title>
                    <Form>
                        <UploadFieldWithHelp
                            id="densityBedUpload"
                            label="Host Gene Densities BED"
                            onChange={(e) => onDensityUpload(e)}
                            errorStatus={densityStatus}
                            errorMessage="Error parsing densities file"
                            tooltipContent={tooltips.densities}
                        />

                        <UploadFieldWithHelp
                            id="hostFaiUpload"
                            label="Host Fasta Index"
                            onChange={(e) => onHostFaiUpload(e)}
                            errorStatus={hostFaiStatus}
                            errorMessage="Error parsing host fasta index file"
                            tooltipContent={tooltips.host_fai}
                        />

                        <UploadFieldWithHelp
                            id="pathFaiUpload"
                            label="Pathogen Fasta Index"
                            onChange={(e) => onPathFaiUpload(e)}
                            errorStatus={pathFaiStatus}
                            errorMessage="Error parsing pathogen fasta index file"
                            tooltipContent={tooltips.path_fai}
                        />
                        <UploadFieldWithHelp
                            id="pathogenGtfUpload"
                            label="Pathogen GTF"
                            onChange={onPathogenGTFUpload}
                            errorStatus={pathogenGtfStatus}
                            errorMessage="Error parsing GTF file"
                            tooltipContent={tooltips.path_gtf}
                        />

                        <UploadFieldWithHelp
                            id="integrationsUpload"
                            label="Integrations"
                            onChange={onIntegrationsUpload}
                            errorStatus={integrationsStatus}
                            errorMessage="Error parsing integrations file"
                            tooltipContent={tooltips.integrations}
                        />

                        <Form.Group controlId="fontSize" className="mb-3">
                            <Form.Label>Font Size</Form.Label>
                            <Form.Control
                                type="number"
                                value={fontSize}
                                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                            />
                        </Form.Group>

                        <Form.Group controlId="width" className="mb-3">
                            <Form.Label>Width</Form.Label>
                            <Form.Control
                                type="number"
                                value={width}
                                onChange={(e) => onWidthChange(Number(e.target.value))}
                            />
                        </Form.Group>

                        <Form.Group controlId="height" className="mb-3">
                            <Form.Label>Height</Form.Label>
                            <Form.Control
                                type="number"
                                value={height}
                                onChange={(e) => onHeightChange(Number(e.target.value))}
                            />
                        </Form.Group>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
};

export default SettingsPanel;