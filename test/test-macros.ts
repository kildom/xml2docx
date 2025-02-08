
// TODO: If implemented, test it more like "test-template.ts".

/*
import * as fs from 'node:fs';

import { resolveAliases } from '../src/aliases';
import { parse, stringify } from '../src/xml';


const input = `

<?xml version="1.0" encoding="UTF-8"?>
<document>
    <DEF:TEST1>
        <some/>
    </DEF:TEST1>
    <DEF:TEST2>
        <TEST1/><other/>
    </DEF:TEST2>
    <DEF:TEST3 attinner="123" inner_alias:alias="TEST1">
        <TEST1/><other_inner/>
    </DEF:TEST3>
    <a/>
    <TEST1/>
    <with_prop attr:alias="TEST3" other_arrt="123"/>
    <TEST2/>
    ---------------------------------------------------------
    <DEF:PARENT attr="99">
        <some_in_parent/>
    </DEF:PARENT>
    <DEF:TESTINH:PARENT attr2="100"  attr="not99"><inside/></DEF:TESTINH:PARENT>
    <test a:alias="TESTINH" aattr="98"/>
    ---------------------------------------------------------
    <testwithparent:PARENT attr="not99" my="1"><TEST1/></testwithparent:PARENT>
    <a><b><c><d></d></c></b></a>
</document>
`;


let document = parse(input, true, true);
fs.writeFileSync('pass1.xml', stringify(document, true));
resolveAliases(document);
fs.writeFileSync('pass2.xml', stringify(document, true));
*/