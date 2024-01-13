/*!
 * Copyright 2023 Dominik Kilian
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
 * following conditions are met:
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following
 *    disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the
 *    following disclaimer in the documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote
 *    products derived from this software without specific prior written permission.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as monaco from 'monaco-editor/esm/vs/editor/editor.main.js';
import React from 'react';
import ReactDOM from 'react-dom';
import {
    Alignment, Button, Callout, Intent, Navbar, Tree, ButtonGroup, Icon, IconName, Popover, Classes, InputGroup, Alert, Spinner
} from '@blueprintjs/core';

import 'normalize.css/normalize.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import { FrontEndEvent, RequestResultType, WorkerEvent, WorkerFile, normalizeFileName } from './web-common';

type Timeout = ReturnType<typeof setTimeout>;

const WORKER_UPDATE_DELAY = 1000;

const worker = new Worker('xml2docx-worker.js');

(self as any).MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
        if (label === 'json') {
            return './vs/language/json/json.worker.js';
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
            return './vs/language/css/css.worker.js';
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return './vs/language/html/html.worker.js';
        }
        if (label === 'typescript' || label === 'javascript') {
            return './vs/language/typescript/ts.worker.js';
        }
        return './vs/editor/editor.worker.js';
    }
};

export interface StateFile {
    readonly name: string;
    readonly mutable: {
        content: Uint8Array | string | monaco.editor.IStandaloneCodeEditor;
        dirty: boolean;
        container?: HTMLElement;
    }
}

export interface MutableStateContainer<T> {
    value: T;
}

export interface State {
    readonly files: StateFile[];
    readonly selectedFile: string;
    readonly mainFile: string;
    readonly errors: string[];
    readonly reset: boolean;
    readonly currentEventId: number;
    readonly receivedEventId: number;
    readonly workerUpdateTimer?: MutableStateContainer<Timeout>;
    readonly alert?: {
        readonly intent: Intent;
        readonly icon: IconName;
        readonly message: string;
        readonly callback?: (result: boolean) => void;
    }
}

function toWorkerFile(file: StateFile): WorkerFile {
    let name = file.name;
    let content = file.mutable.content;
    if (typeof content !== 'string' && !(content instanceof Uint8Array)) {
        content = content.getValue();
    }
    return { name, content };
}

function workerReset(state: State) {
    state = { ...state, currentEventId: state.currentEventId + 1 };
    let event: WorkerEvent = {
        eventId: state.currentEventId,
        files: state.files.map(toWorkerFile),
        mainFile: state.mainFile,
        reset: true,
        requestResult: RequestResultType.NONE,
    };
    //console.log('worker', event);
    worker.postMessage(event);
    state.files.forEach(file => file.mutable.dirty = false);
    setState(state);
}

function workerUpdate(state: State, requestResult: RequestResultType = RequestResultType.NONE) {
    let workerFiles = state.files.filter(file => file.mutable.dirty);
    if (workerFiles.length !== 0 || requestResult !== RequestResultType.NONE) {
        state = { ...state, currentEventId: state.currentEventId + 1 };
        let event: WorkerEvent = {
            eventId: state.currentEventId,
            files: workerFiles.map(toWorkerFile),
            mainFile: state.mainFile,
            reset: false,
            requestResult,
        };
        //console.log('worker', event);
        worker.postMessage(event);
        state.files.forEach(file => file.mutable.dirty = false);
    }
    if (state.workerUpdateTimer) {
        clearTimeout(state.workerUpdateTimer.value);
        state = { ...state, workerUpdateTimer: undefined };
    }
    setState(state);
}

function scheduleWorkerUpdate(state: State) {
    if (state.workerUpdateTimer) {
        clearTimeout(state.workerUpdateTimer.value);
        state.workerUpdateTimer.value = setTimeout(() => workerUpdate(getState()), WORKER_UPDATE_DELAY);
    } else {
        state = {...state, workerUpdateTimer: {
            value: setTimeout(() => workerUpdate(getState()), WORKER_UPDATE_DELAY),
        }};
    }
    setState(state);
}

const initialState: State = {
    files: sortFiles([
        {name: 'main.xml', mutable: { content: '<?xml version="1.0" encoding="UTF-8"?>\n<document>\n</document>', dirty: true } },
        {name: 'other.xml', mutable: { content: '<b>Some additional file</b>', dirty: true } },
        {name: 'data.json', mutable: { content: '{\n "some": true\n}', dirty: true } },
        {name: 'cat.jpeg', mutable: { content: new Uint8Array(), dirty: true } },
    ]),
    errors: ['Waiting for initialization....'],
    selectedFile: 'data.json',
    mainFile: 'main.xml',
    reset: true,
    currentEventId: 0,
    receivedEventId: -1,
};

let curState: State;
let tempState: State | undefined = undefined;
let setStateReal: React.Dispatch<React.SetStateAction<State>>;

function setState(state: State) {
    if (tempState) {
        if (state === tempState) return; // ignore - this is recently set state
    } else {
        if (state === curState) return; // ignore - this is current state
    }
    tempState = state;
    setStateReal(state);
}

function getState(): State {
    return tempState ? tempState : curState;
}

function iconFromFileName(fileName: string): IconName {
    let n = fileName.toLowerCase();
    if (n.endsWith('.xml')) return 'code';
    if (n.endsWith('.json') || n.endsWith('.js')) return 'database';
    return 'media';
}

function showAlert(message: string, icon: IconName, intent: Intent = Intent.NONE, callback?: (result: boolean) => void): void {
    let state: State = {...getState(), alert: { intent, icon, message, callback, }};
    setState(state);
}

function hideAlert() {
    let state = { ...getState() };
    delete state.alert;
    setState(state);
}

function selectMainFile(index: number) {
    let state = getState();
    let file = state.files[index];
    if (state.mainFile !== file.name) {
        state = {...state, mainFile: file.name};
        workerReset(state);
    }
}

function showEditor(file: StateFile) {
    let panel = document.querySelector('#editorPanel') as HTMLElement;
    [...panel.childNodes].forEach(child => panel.removeChild(child));
    if (!file.mutable.container) {
        let editor: monaco.editor.IStandaloneCodeEditor | undefined = undefined;
        let language: string | undefined = undefined;
        let n = file.name.toLowerCase();
        if (n.endsWith('.xml')) {
            language = 'xml';
        } else if (n.endsWith('.js')) {
            language = 'javascript';
        } else if (n.endsWith('.json')) {
            language = 'json';
        }
        let container = document.createElement('div');
        container.className = 'editor';
        panel.appendChild(container);
        if (language) {
            let content = file.mutable.content;
            if (content instanceof Uint8Array) {
                content = new TextDecoder().decode(content);
            } else if (typeof content === 'string') {
                // no need to convert
            } else {
                let oldEditor = content;
                content = oldEditor.getValue();
                oldEditor.dispose();
            }
            editor = monaco.editor.create(container, {
                value: content,
                language: language,
                theme: 'vs-dark',
                automaticLayout: true,
            });
            editor.onDidChangeModelContent(() => {
                file.mutable.dirty = true;
                scheduleWorkerUpdate(getState());
            });
            file.mutable.content = editor;
        } else {
            container.innerHTML = 'TODO: image loading';
        }
        file.mutable.container = container;
    }
    panel.appendChild(file.mutable.container);
}

function selectFile(index: number) {
    let state = getState();
    let file = state.files[index];
    if (state.selectedFile !== file.name) {
        setState({...state, selectedFile: file.name});
    }
    showEditor(file);
}

function sortFiles(files: StateFile[]) {
    const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
    files.sort((a, b) => collator.compare(a.name, b.name));
    return files;
}

function disposeFile(file: StateFile) {
    let content = file.mutable.content;
    if (!(content instanceof Uint8Array) && typeof content !== 'string') {
        content.dispose();
    }
    file.mutable.content = '';
}

function deleteFile(index: number) {
    let state = getState();
    if (state.files[index].name === state.mainFile) {
        showAlert('You cannot delete main file. Set different file as a main file and retry.', 'info-sign', Intent.PRIMARY);
        return;
    }
    showAlert(`Are you sure you want to delete "${state.files[index].name}"?`, 'trash', Intent.DANGER, result => {
        if (result) {
            let state = getState();
            let files = [...state.files];
            disposeFile(files[index]);
            files.splice(index, 1);
            state = { ...state, files };
            workerReset(state);
        }
    });
}

function setFileName(index: number, name: string) {
    let state = getState();
    name = normalizeFileName(name);
    if (name === '' || name.split('/').at(-1)!.indexOf('.') < 0) {
        console.log(name);
        showAlert('Invalid file name!', 'issue', Intent.WARNING);
        console.log(state);
        return;
    }
    state.files.forEach((file, i) => console.log(file.name, name, i, index));
    if (state.files.some((file, i) => file.name === name && i !== index)) {
        showAlert('File already exists!', 'issue', Intent.WARNING);
        return;
    }
    let files = [...state.files];
    files[index] = { ...files[index], name };
    let newState = { ...state, files };
    if (state.files[index].name === state.selectedFile) {
        newState.selectedFile = name;
    }
    if (state.files[index].name === state.mainFile) {
        newState.mainFile = name;
    }
    newState.files = sortFiles(files);
    workerReset(newState);
}

function download(state: State, reqType: RequestResultType) {
    workerUpdate(state, reqType);
}

function FileProperties({file, index }: { file: StateFile, index: number }) {
    const [name, setName] = React.useState<string>(file.name);
    return (<Popover
        interactionKind="click"
        popoverClassName={Classes.POPOVER_CONTENT_SIZING}
        placement="bottom"
        content={
            <>
                <div style={{paddingBottom: 16, width: 300}}>
                    <InputGroup defaultValue={file.name} onValueChange={text => setName(text)}/>
                </div>
                <div style={{textAlign: 'right', width: 300}}>
                    <ButtonGroup style={{float: 'left'}}>
                        <Button intent={Intent.DANGER} icon="trash" className={Classes.POPOVER_DISMISS}
                            onClick={() => deleteFile(index)} />
                        <Button text="Main file" intent={Intent.SUCCESS} icon="rocket" className={Classes.POPOVER_DISMISS}
                            onClick={() => selectMainFile(index)} />
                    </ButtonGroup>
                    <ButtonGroup>
                        <Button text="  Rename  " intent={Intent.PRIMARY} className={Classes.POPOVER_DISMISS}
                            onClick={() => setFileName(index, name)} />
                    </ButtonGroup>
                </div>
            </>
        }
    >
        <Button className="bp5-minimal" icon="more" />
    </Popover>);
}

let firstTime = true;

function App() {
    let arr = React.useState<State>({...initialState});
    let state = arr[0];
    setStateReal = arr[1];
    curState = state;
    tempState = undefined;
    let inProgress = state.workerUpdateTimer || state.currentEventId !== state.receivedEventId;
    console.log('CURRENT STATE:', state);
    if (firstTime) {
        setTimeout(() => scheduleWorkerUpdate(getState()), 300);
        firstTime = false;
    }
    return (
        <>
            <Alert
                confirmButtonText='   OK   '
                cancelButtonText={state.alert?.callback ? '  Cancel  ' : undefined}
                intent={state.alert?.intent}
                isOpen={!!state.alert}
                canEscapeKeyCancel={true}
                canOutsideClickCancel={true}
                onConfirm={() => { state.alert?.callback?.(true); hideAlert(); }}
                onCancel={() => { state.alert?.callback?.(false); hideAlert(); }}
            >
                <Callout intent={state.alert?.intent} icon={state.alert?.icon}>
                    {state.alert?.message}
                </Callout>
            </Alert>
            <div style={{ paddingTop: 0 }}>
                { inProgress
                    ? <div style={{ display: 'block', position: 'absolute', paddingLeft: 1, paddingTop: 3, zIndex: 100000}}>
                        <Spinner size={43} intent={Intent.DANGER}/>
                    </div>
                    : <></>
                }
                { state.errors.length
                    ? <Callout title={`Conversion result: ${state.receivedEventId >= 0 ? 'Error' : 'Initialization'}`}
                        icon={ inProgress ? 'more' : 'error' } intent={Intent.DANGER}>
                        <div style={{ overflowY: 'auto', height: 170 }}>
                            <div style={{ paddingTop: 20, paddingBottom: 30 }}>
                                {state.errors.map(m => (<>{m}<br/></>))}
                            </div>
                        </div>
                    </Callout>
                    : <Callout title="Conversion result: Success" icon={ inProgress ? 'more' : 'tick-circle' }
                        intent={Intent.PRIMARY}>
                        <div style={{ overflowY: 'auto', height: 170 }}>
                            <div style={{ paddingTop: 20, paddingBottom: 30 }}>
                                Conversion was successful. You can now download the output.
                            </div>
                            <div style={{ width: 315 }}>
                                <ButtonGroup fill={true}>
                                    <Button icon="document" text="Download document" intent={Intent.SUCCESS}
                                        onClick={() => download(state, RequestResultType.DOCX)} />
                                    <Button icon="compressed" text="Download all" intent={Intent.NONE}
                                        onClick={() => download(state, RequestResultType.ZIP)} />
                                </ButtonGroup>
                            </div>
                        </div>
                    </Callout>
                }
            </div>
            <Navbar>
                <Navbar.Group align={Alignment.LEFT}>
                    <Navbar.Heading>xml2docx</Navbar.Heading>
                    <Navbar.Divider />
                    <Button className="bp5-minimal" icon="export" />
                    <Button className="bp5-minimal" icon="import" />
                </Navbar.Group>
                <Navbar.Group align={Alignment.RIGHT}>
                    <Button className="bp5-minimal" icon="document-share" text="Download" />
                </Navbar.Group>
            </Navbar>
            <div style={{ overflowY: 'auto' }}>
                <Tree contents={state.files.map((file, i) => ({
                    secondaryLabel: (<FileProperties file={file} index={i}/>),
                    depth: 0,
                    id: file.name,
                    isSelected: state.selectedFile === file.name,
                    label: state.mainFile === file.name
                        ? (<span style={{color: state.selectedFile === file.name
                            ? '#8F9' : '#5A6', fontWeight: 'bold'}}>{file.name}</span>)
                        : file.name,
                    path: [i],
                    icon: state.mainFile === file.name
                        ? (<Icon icon={iconFromFileName(file.name)} size={16} className="bp5-tree-node-icon"
                            color={state.selectedFile === file.name ? '#8F9' : '#5A6'}/>)
                        : iconFromFileName(file.name),
                }))}
                onNodeClick={(node, path) => selectFile(path[0])}
                onNodeDoubleClick={(node, path) => selectMainFile(path[0])}
                />
            </div>
        </>
    );
}

function onWorkerEvent(event: FrontEndEvent) {
    let state = getState();
    state = { ...state, receivedEventId: event.eventId, errors: event.errors };
    setState(state);
    if (event.result && event.resultType !== RequestResultType.NONE) {
        let url = URL.createObjectURL(new Blob([event.result]));
        let element = document.createElement('a');
        element.setAttribute('href', url);
        switch (event.resultType) {
        case RequestResultType.DOCX:
            element.setAttribute('download', 'xml2docx-output.docx');
            break;
        case RequestResultType.DEBUG:
        case RequestResultType.ZIP:
            element.setAttribute('download', 'xml2docx-bundle.zip');
            break;
        }
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
}

window.onload = () => {
    worker.onmessage = (e) => { onWorkerEvent(e.data as FrontEndEvent); };
    ReactDOM.render(<App />, document.getElementById('reactRoot'));
};

