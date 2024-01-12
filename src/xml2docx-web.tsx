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

import * as docx from "docx";
import { template } from 'underscore';
import { convert } from './converter';
import { fromTemplate } from './template';
import { os, setInterface } from './os';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.main.js';
//import * as monaco from 'monaco-editor';
//import monacode from 'https://unpkg.com/monacode/index.min.js';
import React from "react";
import ReactDOM from "react-dom";
import { Alignment, Button, Callout, Intent, Navbar, Section, Tree } from "@blueprintjs/core";

import "normalize.css/normalize.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";

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
});

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


function App() {
    return (
        <div>
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
                <Tree contents={new Array(80).fill(0).map((x, i) => ({
                    depth: 0,
                    id: i,
                    isSelected: i == 20,
                    label: 'abc ' + i,
                    path: [i],
                    icon: i < 4 ? 'code' : i < 5 ? 'database' : i < 7 ? 'document' : 'media',
                }))} />
            </div>
            <div style={{ paddingTop: 0 }}>
                <Callout title="Convertion result - Error" icon="error" intent={Intent.DANGER}>
                <div style={{ overflowY: "auto", height: 170 }}>
                        <div style={{ paddingTop: 20, paddingBottom: 30 }}>
                        Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            Invalid new element "SomeUnexpectedElement".
                            </div>
                    </div>
                </Callout>
                <Callout title="Convertion result - Success" icon="tick-circle" intent={Intent.PRIMARY}>
                    <div style={{ overflowY: "auto", height: 170 }}>
                        <div style={{ paddingTop: 20, paddingBottom: 30 }}>Convertion was successful. You can now download the output.</div>
                        <Button icon="download" text="Download" intent={Intent.SUCCESS} large={true} style={{ width: 315 }} />
                    </div>
                </Callout>
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


