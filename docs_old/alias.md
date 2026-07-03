# Aliases

An alias serves as a method to avoid repeating the same pattern in many
different places or organize your XML structure efficiently.

After parsing the source XML, the converter do alias resolution pass
that produces new XML with all aliases resolved to actual content.

## Alias definition `<DEF:…>`

You must define an alias anywhere before first use.
After alias resolution pass, the definition element will be removed.

The alias definition syntax is following:
```xml
<DEF:ALIAS_NAME attr1="value1" attr2="value2" ...>
    ...
    children
    ...
</DEF:ALIAS_NAME>
```

`ALIAS_NAME` must be valid XML tag name.
Good practice is using upper case letters to avoid collisions
with other tags. Attributes and children are optional.

Now, you can [place](#place) children of this definition anywhere or
[merge](#merge) it with any other element.

## Place

You can use alias as an XML element.
`<ALIAS_NAME/>` will be replaced by all the children
from this alias.

For example:

```xml
<!-- Alias definition -->
<DEF:WARNING_SIGN><b color="red">WARNING!</b></DEF:WARNING_SIGN>

<!-- Alias usage -->
<WARNING_SIGN/> Mind the gap

<!-- It will produce -->
<b color="red">WARNING!</b> Mind the gap
```

## Merge

You can merge alias into another element.
`<…:ALIAS_NAME>` will produce element `…` that have all the attributes
and children from both alias and `…` element.

Attributes from local element will override attributes with the same name
from the alias. Children from alias will be before children of
the local element.

For example:

```xml
<!-- Alias definition -->
<DEF:WARNING_PARAGRAPH border="single red 1mm 2mm">
    <b color="red">WARNING!</b>
</DEF:WARNING_PARAGRAPH>

<!-- Alias usage -->
<p:WARNING_PARAGRAPH>
    Mind the gap
</p:WARNING_PARAGRAPH>

<!-- It will produce -->
<p border="single red 1mm 2mm">
    <b color="red">WARNING!</b> Mind the gap
</p>
```
