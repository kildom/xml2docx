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

import { exec } from './exec';
import { setInterface } from './os';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.main.js';
//import * as monaco from 'monaco-editor';
//import monacode from 'https://unpkg.com/monacode/index.min.js';
import React from 'react';
import ReactDOM from 'react-dom';
import {
    Alignment, Button, Callout, Intent, Navbar, Tree, ButtonGroup, Icon, IconName, Popover, Classes, InputGroup,
    Alert, HotkeysProvider, HotkeysTarget2, HotkeyConfig
} from '@blueprintjs/core';


import 'normalize.css/normalize.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';

let templateText = `
<?xml version="1.0" encoding="UTF-8"?>
<document>

  
<!--
Paragraph styles, documentation:
https://docx.js.org/api/interfaces/IParagraphStyleOptions.html
-->

<ParagraphStyle id="Normal" name="Normal">
<run font="Arial" size="12pt"  />
<paragraph>
  <spacing after:pt20="4mm" />
</paragraph>
</ParagraphStyle>

<ParagraphStyle id="WithIndent" name="With Indent" basedOn="Normal">
<paragraph alignment="both">
  <indent firstLine="9mm" />
</paragraph>
</ParagraphStyle>

<ParagraphStyle id="InTable" name="In Table" basedOn="Normal">
<paragraph>
  <spacing after:pt20="0mm" />
</paragraph>
</ParagraphStyle>

<ParagraphStyle id="HeaderParagraph" name="Footer Paragraph" basedOn="Normal">
<paragraph alignment="center">
  <spacing after:pt20="4mm" />
  <border>
    <bottom size:pt8="0.25mm" space:pt="4mm" style="single" />
  </border>
</paragraph>
</ParagraphStyle>

<ParagraphStyle id="FooterParagraph" name="Footer Paragraph" basedOn="Normal">
<paragraph>
  <spacing before:pt20="4mm" />
  <tabStops>
    <_ position:dxa="1cm" type="left" />
    <_ position:dxa="9cm" type="center" />
    <_ position:dxa="17cm" type="right" />
  </tabStops>
  <border>
    <top size:pt8="0.25mm" space:pt="4mm" style="single" />
  </border>
</paragraph>
</ParagraphStyle>

<ParagraphStyle id="Heading1" name="Heading 1" basedOn="Normal">
<paragraph alignment="center" />
<run size="24pt" bold:bool="true" />
</ParagraphStyle>

<ParagraphStyle id="Heading2" name="Heading 2" basedOn="Normal">
<paragraph alignment="center" />
<run size="18pt" bold:bool="true" color="#4466EE" />
</ParagraphStyle>

<!--
Character styles, documentation:
https://docx.js.org/api/interfaces/ICharacterStyleOptions.html
-->

<CharacterStyle id="Important" name="Important">
<run size="14pt" bold:bool="true" />
</CharacterStyle>

<!--
Aliases, see README.md
-->

<Alias id="LCRTabs">
<_ position:dxa="1cm" type="left" />
<_ position:dxa="9cm" type="center" />
<_ position:dxa="17cm" type="right" />
</Alias>

  <Alias id="border">
    <bottom size:pt8="0.25mm" space:pt="5mm" style="single" />
  </Alias>

  <Section>
    <properties>
      <page>
        <size orientation="portrait" width="210mm" height="297mm" />
        <margin top="1.5cm" right="1.5cm" bottom="1.5cm" left="1.5cm" />
        <borders>
          <pageBorders display="allPages" offsetFrom="page" />
          <pageBorderTop style="single" size:pt8="0.3mm" space:pt="1cm" />
          <pageBorderBottom style="single" size:pt8="0.3mm" space:pt="1cm" />
          <pageBorderLeft style="single" size:pt8="0.3mm" space:pt="1cm" />
          <pageBorderRight style="single" size:pt8="0.3mm" space:pt="1cm" />
        </borders>
      </page>
    </properties>
    <headers>
      <default>
        <Header:new>
          <children:FileChildren>
            <p style="HeaderParagraph">Demo Document</p>
          </children:FileChildren>
        </Header:new>
      </default>
    </headers>
    <footers>
      <default>
        <Footer:new>
          <children:FileChildren>
            <p style="FooterParagraph">&#9;<a href="https://github.com/kildom/xml2docx">See on GitHub</a>&#9;<b>xml2docx</b>&#9;Page <CurrentPageNumber /> of <TotalPages /></p>
          </children:FileChildren>
        </Footer:new>
      </default>
    </footers>
  </Section>

  <h1>Demo Document</h1>

  <h2>Paragraphs</h2>

  <p style="WithIndent">Lorem ipsum dolor sit amet, magna et tincidunt varius. Donec et viverra leo. Nunc nec velit sed quam
    lobortis enim. Maecenas id dignissim leo. Cras imperdiet purus sit amet mi pellentesque, eget porttitor nisl
    tincidunt. Curabitur orci erat, laoreet eget felis at, pretium ornare augue.</p>
  <p style="WithIndent">Nunc enim odio, lobortis ut turpis et, auctor aliquam eros. Mauris justo ante, auctor quis condimentum vitae,
    eleifend eu augue. Duis ut mattis nisi. Phasellus sodales, quam nec varius blandit, sem erat tristique mi, ac
    placerat lacus ante a ipsum. Pellentesque habitant morbi tristique senectus et netus et malesuada fames.</p>
  
  <h2>Formatting</h2>

  <p><b>Bold</b>, <i>italics</i>, <u>underline</u>, <s>strike through</s>,
    <super>super</super>script, <sub>sub</sub>script, <allCaps>all caps</allCaps>,
    <smallCaps>Small Caps</smallCaps>, <doubleStrike>double strike through</doubleStrike>,
    <emboss>emboss</emboss>, <font name="Times New Roman">Times New Roman</font>,
    <font size="24pt">bigger</font>, <font color="#008800">green</font>,
    <font highlight="yellow">highlight</font>, <font style="Important">style</font>,
    <font scale="200">scale</font>, <font spacing="3mm">spacing</font>
  </p>

  <h2><img src="cat.jpg" width="3.333cm" height="5cm"
    horizontalOffset="0cm" horizontalRelative="margin" horizontalAlign="right"
    verticalOffset="0cm" verticalRelative="line" verticalAlign="top"
    wrapType="square" marginBottom="4mm" marginLeft="4mm" marginTop="4mm" marginRight="4mm" wrapSide="bothSides"
    />Image</h2>

  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras tincidunt, augue eu mattis auctor, ante sem aliquet
    dolor, at efficitur enim sem sit amet mauris. Donec at porta ligula, non ornare diam. Integer eleifend lacinia
    nulla non auctor. In id leo posuere augue aliquam auctor. Suspendisse non finibus libero.</p>
  <p>Maecenas congue nisl id felis vehicula, quis hendrerit nisi tincidunt. Fusce hendrerit turpis quam, vitae
    laoreet arcu egestas et. Duis tempor scelerisque elit, vel euismod erat varius et.</p>
  
  <h2>Tab stops</h2>

  <p tabStops:alias="LCRTabs">&#9;Left&#9;Center&#9;Right</p>
  <p><__>
    <tabStops>
      <_ position:dxa="4cm" type="left" />
      <_ position:dxa="9cm" type="center" />
      <_ position:dxa="14cm" type="right" />
    </tabStops>
  </__><tab/>Left<tab/>Center<tab/>Right</p>

  <h2>Breaks</h2>
  <p>Before page break.<PageBreak/>After page break.</p>
  <p>Before line break.<br/>After line break.</p>

  <h2>Table</h2>

  <Alias id="tdWithMargins">
    <margins marginUnitType="dxa" top:dxa="2mm" bottom:dxa="2mm" left:dxa="2mm" right:dxa="2mm" />
  </Alias>

  <Alias id="headWithMargins" _="tdWithMargins">
    <shading color="#EEEEEE" type="solid"/>
  </Alias>

  <table>
    <tr>
      <td _="headWithMargins"><p style="InTable"><b>Column 1</b></p></td>
      <td _="headWithMargins"><p style="InTable"><b>Column 2</b></p></td>
      <td _="headWithMargins"><p style="InTable"><b>Column 3</b></p></td>
    </tr>
    <tr>
      <td _="tdWithMargins"><p style="InTable">This is</p></td>
      <td _="tdWithMargins"><p style="InTable">a flexible</p></td>
      <td _="tdWithMargins"><p style="InTable">table.</p></td>
    </tr>
  </table>

  <p></p>
  
  <table layout="fixed" columnWidths="5cm, 5cm, 3cm">
    <tr>
      <td _="headWithMargins"><p style="InTable"><b>Column 1</b></p></td>
      <td _="headWithMargins"><p style="InTable"><b>Column 2</b></p></td>
      <td _="headWithMargins"><p style="InTable"><b>Column 3</b></p></td>
    </tr>
    <tr>
      <td _="tdWithMargins"><p style="InTable">This is</p></td>
      <td _="tdWithMargins"><p style="InTable">a fixed</p></td>
      <td _="tdWithMargins"><p style="InTable">table.</p></td>
    </tr>
  </table>

  <p></p>

  <h2>Template</h2>

  <p>Title from template data: <font color="#EE0000"><%- title %></font></p>
  <p>Description with formatting: <%= description %></p>
  <p>Description escaped: <%- description %></p>

  <table layout="fixed" columnWidths="8cm, 3cm, 3cm">
    <tr>
      <td _="headWithMargins"><p style="InTable"><b>Title</b></p></td>
      <td _="headWithMargins"><p style="InTable"><b>Year</b></p></td>
      <td _="headWithMargins"><p style="InTable"><b>Rating</b></p></td>
    </tr>
    <tr>
      <td _="tdWithMargins" columnSpan:int="3"><p style="InTable" alignment="center"><b>Without sorting</b></p></td>
    </tr>
    <% for (let m of movies) { %>
    <tr>
      <td _="tdWithMargins"><p style="InTable"><%- m.title %></p></td>
      <td _="tdWithMargins"><p style="InTable"><%- m.year %></p></td>
      <td _="tdWithMargins"><p style="InTable"><%- m.rating %></p></td>
    </tr>
    <% } %>
    <tr>
      <td _="tdWithMargins" columnSpan:int="3"><p style="InTable" alignment="center"><b>Sorted by rating</b></p></td>
    </tr>
    <% movies.sort((a, b) => b.rating - a.rating); %>
    <% for (let m of movies) { %>
    <tr>
      <td _="tdWithMargins"><p style="InTable"><%- m.title %></p></td>
      <td _="tdWithMargins"><p style="InTable"><%- m.year %></p></td>
      <td _="tdWithMargins"><p style="InTable"><%- m.rating %></p></td>
    </tr>
    <% } %>
  </table>

  <p></p>

</document>
`;

let data = {
    // Superset of JSON is allowed, any JavaScript expression can be used here.
    title: "Random movies",
    description: "List of <b>random</b> movies.",
    movies: [
        {
            title: 'The Green Mile',
            year: 1999,
            rating: 8.6,
        },
        {
            title: 'The Shawshank Redemption',
            year: 1994,
            rating: 8.8,
        },
        {
            title: 'Forrest Gump',
            year: 1994,
            rating: 8.5,
        },
        {
            title: 'Requiem for a Dream',
            year: 2000,
            rating: 7.8,
        },
        {
            title: 'The Matrix',
            year: 1999,
            rating: 7.6,
        },
        {
            title: 'The Silence of the Lambs',
            year: 1991,
            rating: 8.2,
        },
    ]
};

let output: string;

/*
async function main() {
    let templateFile = 'in.xml';
    let dataFile = 'in.json';
    let xmlText = fromTemplate(templateFile, templateText, dataFile || '[no data]', data);
    output = await convert(templateFile, xmlText, true);
}

async function download() {
    console.log('Compiling...');
    await main();
    await new Promise(r => setTimeout(r, 2000));
    console.log('Downloading...');
    let element = document.createElement('a');
    element.setAttribute('href', 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,' + encodeURIComponent(output));
    //element.setAttribute('href', 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ==');
    element.setAttribute('download', 'demo.docx');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

setInterface({
    error: [],
    path: {
        resolve: (...paths: string[]) => {
            return paths.join('/');
        },
        dirname: (path: string) => {
            return path;
        },
    },
    fs: {
        readFileSync: (path: string, encoding?: 'utf-8') => {
            console.log(`reading file ${path}`);
            return encoding ? '' : new Uint8Array(0);
        },
        writeFileSync: (path: string, data: string | Uint8Array) => {
            console.log(`writing file ${path}`, data);
        },
    }
});*/

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

export enum TranslationState {
    PROGRESS = 'progress',
    ERROR = 'error',
    READY = 'ready',
}

export interface StateFile {
    name: string;
    dynamic: {
        content: Uint8Array | string;
        dirty: boolean;
    }
}

export interface State {
    files: StateFile[];
    selectedFile: string;
    mainFile: string;
    translationState: TranslationState;
    errors: string[];
    reset: boolean;
    alert?: {
        intent: Intent;
        icon: IconName;
        message: string;
        callback?: (result: boolean) => void;
    }
}

export enum RequestResultType {
    NONE,
    DOCX,
    ZIP,
    DEBUG, // TODO: Add debug to GUI
}

export interface WorkerEvent {
    eventId: number;
    files: StateFile[];
    mainFile: string;
    reset: boolean;
    requestResult: RequestResultType;
}

export interface FrontEndEvent {
    eventId: number;
    errors: string[];
    result?: Uint8Array;
}

let currentEventId = 0;

function workerReset(state: State) {
    currentEventId++;
    console.log('worker', {
        eventId: currentEventId,
        files: state.files,
        mainFile: state.mainFile,
        reset: true,
        requestResult: RequestResultType.NONE,
    });
    state.files.forEach(file => file.dynamic.dirty = false);
}

function workerUpdate(state: State, requestResult: RequestResultType = RequestResultType.NONE) {
    let workerFiles = state.files.filter(file => file.dynamic.dirty);
    if (workerFiles.length === 0) {
        return;
    }
    currentEventId++;
    console.log('worker', {
        eventId: currentEventId,
        files: workerFiles,
        mainFile: state.mainFile,
        reset: false,
        requestResult,
    });
    state.files.forEach(file => file.dynamic.dirty = false);
}

const initialState: State = {
    files: sortFiles([
        {name: 'main.xml', dynamic: { content: '', dirty: true } },
        {name: 'other.xml', dynamic: { content: '', dirty: true } },
        {name: 'data.json', dynamic: { content: '', dirty: true } },
        {name: 'cat.jpeg', dynamic: { content: new Uint8Array(), dirty: true } },
    ]),
    errors: [],
    selectedFile: 'data.json',
    mainFile: 'main.xml',
    translationState: TranslationState.PROGRESS,
    reset: true,
};

let curState: State;
let tempState: State | undefined = undefined;
let setState2: React.Dispatch<React.SetStateAction<State>>;

function setState(state: State) {
    /*console.log('SET STATE:', state);
    try {
        throw new Error();
    } catch (err) {
        console.error(err);
    }*/
    tempState = state;
    setState2(state);
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
    let newstate: State = {...getState(), alert: {
        intent,
        icon,
        message,
        callback,
    }};
    console.log('NEW', newstate);
    setState(newstate);
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
        setState(state);
        workerReset(state);
    }
}

function selectFile(index: number) {
    let state = getState();
    let file = state.files[index];
    if (state.selectedFile !== file.name) {
        setState({...state, selectedFile: file.name});
    }
}

function sortFiles(files: StateFile[]) {
    const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
    files.sort((a, b) => collator.compare(a.name, b.name));
    return files;
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
            files.splice(index, 1);
            state = { ...state, files };
            setState(state);
            workerReset(state);
        }
    });
}

function setFileName(index: number, name: string) {
    let state = getState();
    let parts = name
        .split(/[\\/]+/)
        .map(p => p.trim())
        .filter(p => p);
    name = parts.join('/');
    if (name === '' || parts.at(-1)!.indexOf('.') < 0) {
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
    setState(newState);
    workerReset(newState);
}

function FileProperties({file, index }:{file: StateFile, index: number}) {
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
                    </ButtonGroup> &nbsp;
                    <ButtonGroup>
                        <Button text="  Cancel  " intent={Intent.NONE} className={Classes.POPOVER_DISMISS} />
                    </ButtonGroup> &nbsp;
                    <ButtonGroup>
                        <Button text="   OK   " intent={Intent.PRIMARY} className={Classes.POPOVER_DISMISS}
                            onClick={() => setFileName(index, name)} />
                    </ButtonGroup>
                </div>
            </>
        }
    >
        <Button className="bp5-minimal" icon="more" />
    </Popover>);
}

function App() {
    let arr = React.useState<State>({...initialState});
    let state = arr[0];
    setState2 = arr[1];
    curState = state;
    tempState = undefined;
    console.log('CURRENT STATE:', state);
    return (
        <div>
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
                { state.errors.length ? (
                    <Callout title="Convertion result - Error" icon="error" intent={Intent.DANGER}>
                    <div style={{ overflowY: "auto", height: 170 }}>
                            <div style={{ paddingTop: 20, paddingBottom: 30 }}>
                            Invalid new element "SomeUnexpectedElement".
                                Invalid new element "SomeUnexpectedElement".
                                Invalid new element "SomeUnexpectedElement".
                                </div>
                        </div>
                    </Callout>
                ) : (
                    <Callout title="Convertion result - Success" icon="tick-circle" intent={Intent.PRIMARY}>
                        <div style={{ overflowY: "auto", height: 170 }}>
                            <div style={{ paddingTop: 20, paddingBottom: 30 }}>Convertion was successful. You can now download the output.</div>
                            <div style={{ width: 315 }}>
                            <ButtonGroup fill={true}>
                            <Button icon="document" text="Download document" intent={Intent.SUCCESS} />
                            <Button icon="compressed" text="Download all" intent={Intent.NONE} />
                            </ButtonGroup>
                            </div>
                        </div>
                    </Callout>
                ) }
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
            <div style={{ height: 400, overflowY: 'auto' }}>
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
        </div>
    );
}

window.onload = () => {
    console.log('loaded');
    if (document.getElementById('btn'))
        document.getElementById('btn')!.onclick = () => { download() };
    /*monacode({
        container: document.getElementById('editor') as HTMLElement,
        value: '<aaa>Download</aaa>',
        theme: "vs-dark",
    });*/
    monaco.editor.create(document.getElementById('editor') as HTMLElement, {
        value: templateText,
        language: "xml",
        theme: "vs-dark",
        automaticLayout: true,
    });

    /*monaco.editor.create(document.getElementById('container') as HTMLElement, {
        value: ['function x() {', '\tconsole.log("Hello world!");', '}'].join('\n'),
        language: 'javascript'
    });*/

    ReactDOM.render(<App />, document.getElementById("reactRoot"));

    main();
};


