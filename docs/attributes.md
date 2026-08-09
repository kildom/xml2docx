# Attributes

TODO: Add general information about attributes in DocTML here.


## Boolean

The **Boolean** type represents a true or false value.
It can be expressed in different forms, as shown in the table below.
The value is case insensitive, so `true`, `True`, and `TRUE` are all equivalent.

True Value | False Value | Note
-----------|-------------|-----------------
**`y`**    | **`n`**     | **Recommended**
`yes`      | `no`        |
`t`        | `f`         |
`true`     | `false`     |
`1`        | `0`         |
`on`       | `off`       |

Example:

<!-- @example Boolean attribute - bold text -->
```xml
<font bold="y">Bold text</font>
```
<!-- @end -->

> [!NOTE]
> The **Boolean** type allows you to express values in a variety of ways,
> but it is recommended to use the `y` and `n` for readability and conciseness.

## Length

The **Length** is represented as a number followed by a unit name.
The number can be an integer or a decimal number, and it can be negative.
All available units are summarized below.

   Unit   | Unit length in millimeters | Unit length in inches
----------|----------------------------|-----------------------
 **mm**   | 1                          | 5/127 ≈ 0.03937
 **cm**   | 10                         | 50/127 ≈ 0.3937
 **in**   | 127/5 = 25.4               | 1
 **pt**   | 127/360 ≈ 0.3528           | 1/72 ≈ 0.01389
 **pi**   | 127/30 ≈ 4.233             | 1/6 ≈ 0.1667
 **pc**   | 127/30 ≈ 4.233             | 1/6 ≈ 0.1667
 **px**   | 127/480 ≈ 0.2646           | 1/96 ≈ 0.01042

You can omit the unit name for zero length.

Example:

<!-- @example Length attribute - image dimensions and location -->
```xml
<img width="10cm" height="13cm" horizontal="margin 2mm"
    vertical="paragraph -5mm" margin="0" src="tree.png"/>
```
<!-- @end -->

> [!NOTE]
> The **Length** type allows you to express values using different units,
> but it is recommended to stick with one unit for consistency and clarity,
> for example, using `mm` for all lengths and `pt` for font sizes.

### Non-negative Length

The **Non-negative Length** is a [Length](#length) that cannot be negative.
In other words, it cannot have a minus sign in front of it, but it can be zero.

Example:

// TODO: Example of Non-negative Length attribute in DocTML here.


### Positive Length
    
The **Positive Length** is a [Length](#length) that cannot be negative or zero.
In other words, it cannot have a minus sign in front of it and it cannot be zero.

Example:

// TODO: Example of Positive Length attribute in DocTML here.


## Color

Color is represented as:
* HTML 6 digit hex number preceded by `#` character, for example `#FF0000` for red color.
* HTML 3 digit hex number preceded by `#` character, for example `#F00` for red color.
* CSS color name.
    * All available color names are listed in the table below.
    * They are case insensitive, so `red`, `Red`, and `RED` are all equivalent.
    * You can add minus sign `-` or underscore `_` to separate words in color names, for example `light-blue`, `Light_Blue`, and `lightblue` are all equivalent.

Example of using color attribute in DocTML:

```xml { prefix: '<document>', suffix: '</document>' }
<p font.color="#FF0000">This text is using 6-digit hex color</p>
<p font.color="#F00">This text is using 3-digit hex color</p>
<p font.color="red">This text is using CSS color name</p>
```


<#! if (!data.agents) { #>

<style>
/* TODO: Move to CSS file */
.color {
    line-height: 1;
    clear: both;
}
.color b {
    display: inline-block;
    width: 1.7em;
    height: 1.7em;
    border: 1px solid #000;
    float: left;
    margin: 0 0.5em 0.5em 0.5em;
}
.color small {
    font-size: 60%;
    color: #AAA;
}
table, th, td {
    border-spacing: 0px;
    border-collapse: collapse;
}

th, td {
    border: 1px solid silver;
    padding: 10px;
}

th {
    background-color: #e7e7e7;
}


tr:nth-child(2n) {
    background-color: #F5F5F5;
}

</style>

<table>
<tr><td>
<div class="color"><b style="background-color: #F0F8FF"></b>aliceblue<small><br>#F0F8FF</small></div>
<div class="color"><b style="background-color: #FAEBD7"></b>antiquewhite<small><br>#FAEBD7</small></div>
<div class="color"><b style="background-color: #00FFFF"></b>aqua<small><br>#00FFFF</small></div>
<div class="color"><b style="background-color: #7FFFD4"></b>aquamarine<small><br>#7FFFD4</small></div>
<div class="color"><b style="background-color: #F0FFFF"></b>azure<small><br>#F0FFFF</small></div>
<div class="color"><b style="background-color: #F5F5DC"></b>beige<small><br>#F5F5DC</small></div>
<div class="color"><b style="background-color: #FFE4C4"></b>bisque<small><br>#FFE4C4</small></div>
<div class="color"><b style="background-color: #000000"></b>black<small><br>#000000</small></div>
<div class="color"><b style="background-color: #FFEBCD"></b>blanchedalmond<small><br>#FFEBCD</small></div>
<div class="color"><b style="background-color: #0000FF"></b>blue<small><br>#0000FF</small></div>
<div class="color"><b style="background-color: #8A2BE2"></b>blueviolet<small><br>#8A2BE2</small></div>
<div class="color"><b style="background-color: #A52A2A"></b>brown<small><br>#A52A2A</small></div>
<div class="color"><b style="background-color: #DEB887"></b>burlywood<small><br>#DEB887</small></div>
<div class="color"><b style="background-color: #5F9EA0"></b>cadetblue<small><br>#5F9EA0</small></div>
<div class="color"><b style="background-color: #7FFF00"></b>chartreuse<small><br>#7FFF00</small></div>
<div class="color"><b style="background-color: #D2691E"></b>chocolate<small><br>#D2691E</small></div>
<div class="color"><b style="background-color: #FF7F50"></b>coral<small><br>#FF7F50</small></div>
<div class="color"><b style="background-color: #6495ED"></b>cornflowerblue<small><br>#6495ED</small></div>
<div class="color"><b style="background-color: #FFF8DC"></b>cornsilk<small><br>#FFF8DC</small></div>
<div class="color"><b style="background-color: #DC143C"></b>crimson<small><br>#DC143C</small></div>
<div class="color"><b style="background-color: #00FFFF"></b>cyan<small><br>#00FFFF</small></div>
<div class="color"><b style="background-color: #00008B"></b>darkblue<small><br>#00008B</small></div>
<div class="color"><b style="background-color: #008B8B"></b>darkcyan<small><br>#008B8B</small></div>
<div class="color"><b style="background-color: #B8860B"></b>darkgoldenrod<small><br>#B8860B</small></div>
<div class="color"><b style="background-color: #A9A9A9"></b>darkgray<small><br>#A9A9A9</small></div>
<div class="color"><b style="background-color: #006400"></b>darkgreen<small><br>#006400</small></div>
<div class="color"><b style="background-color: #A9A9A9"></b>darkgrey<small><br>#A9A9A9</small></div>
<div class="color"><b style="background-color: #BDB76B"></b>darkkhaki<small><br>#BDB76B</small></div>
<div class="color"><b style="background-color: #8B008B"></b>darkmagenta<small><br>#8B008B</small></div>
<div class="color"><b style="background-color: #556B2F"></b>darkolivegreen<small><br>#556B2F</small></div>
<div class="color"><b style="background-color: #FF8C00"></b>darkorange<small><br>#FF8C00</small></div>
<div class="color"><b style="background-color: #9932CC"></b>darkorchid<small><br>#9932CC</small></div>
<div class="color"><b style="background-color: #8B0000"></b>darkred<small><br>#8B0000</small></div>
<div class="color"><b style="background-color: #E9967A"></b>darksalmon<small><br>#E9967A</small></div>
<div class="color"><b style="background-color: #8FBC8F"></b>darkseagreen<small><br>#8FBC8F</small></div>
<div class="color"><b style="background-color: #483D8B"></b>darkslateblue<small><br>#483D8B</small></div>
<div class="color"><b style="background-color: #2F4F4F"></b>darkslategray<small><br>#2F4F4F</small></div>
</td><td>
<div class="color"><b style="background-color: #2F4F4F"></b>darkslategrey<small><br>#2F4F4F</small></div>
<div class="color"><b style="background-color: #00CED1"></b>darkturquoise<small><br>#00CED1</small></div>
<div class="color"><b style="background-color: #9400D3"></b>darkviolet<small><br>#9400D3</small></div>
<div class="color"><b style="background-color: #FF1493"></b>deeppink<small><br>#FF1493</small></div>
<div class="color"><b style="background-color: #00BFFF"></b>deepskyblue<small><br>#00BFFF</small></div>
<div class="color"><b style="background-color: #696969"></b>dimgray<small><br>#696969</small></div>
<div class="color"><b style="background-color: #696969"></b>dimgrey<small><br>#696969</small></div>
<div class="color"><b style="background-color: #1E90FF"></b>dodgerblue<small><br>#1E90FF</small></div>
<div class="color"><b style="background-color: #B22222"></b>firebrick<small><br>#B22222</small></div>
<div class="color"><b style="background-color: #FFFAF0"></b>floralwhite<small><br>#FFFAF0</small></div>
<div class="color"><b style="background-color: #228B22"></b>forestgreen<small><br>#228B22</small></div>
<div class="color"><b style="background-color: #FF00FF"></b>fuchsia<small><br>#FF00FF</small></div>
<div class="color"><b style="background-color: #DCDCDC"></b>gainsboro<small><br>#DCDCDC</small></div>
<div class="color"><b style="background-color: #F8F8FF"></b>ghostwhite<small><br>#F8F8FF</small></div>
<div class="color"><b style="background-color: #FFD700"></b>gold<small><br>#FFD700</small></div>
<div class="color"><b style="background-color: #DAA520"></b>goldenrod<small><br>#DAA520</small></div>
<div class="color"><b style="background-color: #808080"></b>gray<small><br>#808080</small></div>
<div class="color"><b style="background-color: #008000"></b>green<small><br>#008000</small></div>
<div class="color"><b style="background-color: #ADFF2F"></b>greenyellow<small><br>#ADFF2F</small></div>
<div class="color"><b style="background-color: #808080"></b>grey<small><br>#808080</small></div>
<div class="color"><b style="background-color: #F0FFF0"></b>honeydew<small><br>#F0FFF0</small></div>
<div class="color"><b style="background-color: #FF69B4"></b>hotpink<small><br>#FF69B4</small></div>
<div class="color"><b style="background-color: #CD5C5C"></b>indianred<small><br>#CD5C5C</small></div>
<div class="color"><b style="background-color: #4B0082"></b>indigo<small><br>#4B0082</small></div>
<div class="color"><b style="background-color: #FFFFF0"></b>ivory<small><br>#FFFFF0</small></div>
<div class="color"><b style="background-color: #F0E68C"></b>khaki<small><br>#F0E68C</small></div>
<div class="color"><b style="background-color: #E6E6FA"></b>lavender<small><br>#E6E6FA</small></div>
<div class="color"><b style="background-color: #FFF0F5"></b>lavenderblush<small><br>#FFF0F5</small></div>
<div class="color"><b style="background-color: #7CFC00"></b>lawngreen<small><br>#7CFC00</small></div>
<div class="color"><b style="background-color: #FFFACD"></b>lemonchiffon<small><br>#FFFACD</small></div>
<div class="color"><b style="background-color: #ADD8E6"></b>lightblue<small><br>#ADD8E6</small></div>
<div class="color"><b style="background-color: #F08080"></b>lightcoral<small><br>#F08080</small></div>
<div class="color"><b style="background-color: #E0FFFF"></b>lightcyan<small><br>#E0FFFF</small></div>
<div class="color"><b style="background-color: #FAFAD2"></b>lightgoldenrodyellow<small><br>#FAFAD2</small></div>
<div class="color"><b style="background-color: #D3D3D3"></b>lightgray<small><br>#D3D3D3</small></div>
<div class="color"><b style="background-color: #90EE90"></b>lightgreen<small><br>#90EE90</small></div>
<div class="color"><b style="background-color: #D3D3D3"></b>lightgrey<small><br>#D3D3D3</small></div>
</td><td>
<div class="color"><b style="background-color: #FFB6C1"></b>lightpink<small><br>#FFB6C1</small></div>
<div class="color"><b style="background-color: #FFA07A"></b>lightsalmon<small><br>#FFA07A</small></div>
<div class="color"><b style="background-color: #20B2AA"></b>lightseagreen<small><br>#20B2AA</small></div>
<div class="color"><b style="background-color: #87CEFA"></b>lightskyblue<small><br>#87CEFA</small></div>
<div class="color"><b style="background-color: #778899"></b>lightslategray<small><br>#778899</small></div>
<div class="color"><b style="background-color: #778899"></b>lightslategrey<small><br>#778899</small></div>
<div class="color"><b style="background-color: #B0C4DE"></b>lightsteelblue<small><br>#B0C4DE</small></div>
<div class="color"><b style="background-color: #FFFFE0"></b>lightyellow<small><br>#FFFFE0</small></div>
<div class="color"><b style="background-color: #00FF00"></b>lime<small><br>#00FF00</small></div>
<div class="color"><b style="background-color: #32CD32"></b>limegreen<small><br>#32CD32</small></div>
<div class="color"><b style="background-color: #FAF0E6"></b>linen<small><br>#FAF0E6</small></div>
<div class="color"><b style="background-color: #FF00FF"></b>magenta<small><br>#FF00FF</small></div>
<div class="color"><b style="background-color: #800000"></b>maroon<small><br>#800000</small></div>
<div class="color"><b style="background-color: #66CDAA"></b>mediumaquamarine<small><br>#66CDAA</small></div>
<div class="color"><b style="background-color: #0000CD"></b>mediumblue<small><br>#0000CD</small></div>
<div class="color"><b style="background-color: #BA55D3"></b>mediumorchid<small><br>#BA55D3</small></div>
<div class="color"><b style="background-color: #9370DB"></b>mediumpurple<small><br>#9370DB</small></div>
<div class="color"><b style="background-color: #3CB371"></b>mediumseagreen<small><br>#3CB371</small></div>
<div class="color"><b style="background-color: #7B68EE"></b>mediumslateblue<small><br>#7B68EE</small></div>
<div class="color"><b style="background-color: #00FA9A"></b>mediumspringgreen<small><br>#00FA9A</small></div>
<div class="color"><b style="background-color: #48D1CC"></b>mediumturquoise<small><br>#48D1CC</small></div>
<div class="color"><b style="background-color: #C71585"></b>mediumvioletred<small><br>#C71585</small></div>
<div class="color"><b style="background-color: #191970"></b>midnightblue<small><br>#191970</small></div>
<div class="color"><b style="background-color: #F5FFFA"></b>mintcream<small><br>#F5FFFA</small></div>
<div class="color"><b style="background-color: #FFE4E1"></b>mistyrose<small><br>#FFE4E1</small></div>
<div class="color"><b style="background-color: #FFE4B5"></b>moccasin<small><br>#FFE4B5</small></div>
<div class="color"><b style="background-color: #FFDEAD"></b>navajowhite<small><br>#FFDEAD</small></div>
<div class="color"><b style="background-color: #000080"></b>navy<small><br>#000080</small></div>
<div class="color"><b style="background-color: #FDF5E6"></b>oldlace<small><br>#FDF5E6</small></div>
<div class="color"><b style="background-color: #808000"></b>olive<small><br>#808000</small></div>
<div class="color"><b style="background-color: #6B8E23"></b>olivedrab<small><br>#6B8E23</small></div>
<div class="color"><b style="background-color: #FFA500"></b>orange<small><br>#FFA500</small></div>
<div class="color"><b style="background-color: #FF4500"></b>orangered<small><br>#FF4500</small></div>
<div class="color"><b style="background-color: #DA70D6"></b>orchid<small><br>#DA70D6</small></div>
<div class="color"><b style="background-color: #EEE8AA"></b>palegoldenrod<small><br>#EEE8AA</small></div>
<div class="color"><b style="background-color: #98FB98"></b>palegreen<small><br>#98FB98</small></div>
<div class="color"><b style="background-color: #AFEEEE"></b>paleturquoise<small><br>#AFEEEE</small></div>
</td><td>
<div class="color"><b style="background-color: #DB7093"></b>palevioletred<small><br>#DB7093</small></div>
<div class="color"><b style="background-color: #FFEFD5"></b>papayawhip<small><br>#FFEFD5</small></div>
<div class="color"><b style="background-color: #FFDAB9"></b>peachpuff<small><br>#FFDAB9</small></div>
<div class="color"><b style="background-color: #CD853F"></b>peru<small><br>#CD853F</small></div>
<div class="color"><b style="background-color: #FFC0CB"></b>pink<small><br>#FFC0CB</small></div>
<div class="color"><b style="background-color: #DDA0DD"></b>plum<small><br>#DDA0DD</small></div>
<div class="color"><b style="background-color: #B0E0E6"></b>powderblue<small><br>#B0E0E6</small></div>
<div class="color"><b style="background-color: #800080"></b>purple<small><br>#800080</small></div>
<div class="color"><b style="background-color: #663399"></b>rebeccapurple<small><br>#663399</small></div>
<div class="color"><b style="background-color: #FF0000"></b>red<small><br>#FF0000</small></div>
<div class="color"><b style="background-color: #BC8F8F"></b>rosybrown<small><br>#BC8F8F</small></div>
<div class="color"><b style="background-color: #4169E1"></b>royalblue<small><br>#4169E1</small></div>
<div class="color"><b style="background-color: #8B4513"></b>saddlebrown<small><br>#8B4513</small></div>
<div class="color"><b style="background-color: #FA8072"></b>salmon<small><br>#FA8072</small></div>
<div class="color"><b style="background-color: #F4A460"></b>sandybrown<small><br>#F4A460</small></div>
<div class="color"><b style="background-color: #2E8B57"></b>seagreen<small><br>#2E8B57</small></div>
<div class="color"><b style="background-color: #FFF5EE"></b>seashell<small><br>#FFF5EE</small></div>
<div class="color"><b style="background-color: #A0522D"></b>sienna<small><br>#A0522D</small></div>
<div class="color"><b style="background-color: #C0C0C0"></b>silver<small><br>#C0C0C0</small></div>
<div class="color"><b style="background-color: #87CEEB"></b>skyblue<small><br>#87CEEB</small></div>
<div class="color"><b style="background-color: #6A5ACD"></b>slateblue<small><br>#6A5ACD</small></div>
<div class="color"><b style="background-color: #708090"></b>slategray<small><br>#708090</small></div>
<div class="color"><b style="background-color: #708090"></b>slategrey<small><br>#708090</small></div>
<div class="color"><b style="background-color: #FFFAFA"></b>snow<small><br>#FFFAFA</small></div>
<div class="color"><b style="background-color: #00FF7F"></b>springgreen<small><br>#00FF7F</small></div>
<div class="color"><b style="background-color: #4682B4"></b>steelblue<small><br>#4682B4</small></div>
<div class="color"><b style="background-color: #D2B48C"></b>tan<small><br>#D2B48C</small></div>
<div class="color"><b style="background-color: #008080"></b>teal<small><br>#008080</small></div>
<div class="color"><b style="background-color: #D8BFD8"></b>thistle<small><br>#D8BFD8</small></div>
<div class="color"><b style="background-color: #FF6347"></b>tomato<small><br>#FF6347</small></div>
<div class="color"><b style="background-color: #40E0D0"></b>turquoise<small><br>#40E0D0</small></div>
<div class="color"><b style="background-color: #EE82EE"></b>violet<small><br>#EE82EE</small></div>
<div class="color"><b style="background-color: #F5DEB3"></b>wheat<small><br>#F5DEB3</small></div>
<div class="color"><b style="background-color: #FFFFFF"></b>white<small><br>#FFFFFF</small></div>
<div class="color"><b style="background-color: #F5F5F5"></b>whitesmoke<small><br>#F5F5F5</small></div>
<div class="color"><b style="background-color: #FFFF00"></b>yellow<small><br>#FFFF00</small></div>
<div class="color"><b style="background-color: #9ACD32"></b>yellowgreen<small><br>#9ACD32</small></div>
</td></tr>
</table>

<#! } else { #>

- #F0F8FF aliceblue
- #FAEBD7 antiquewhite
- #00FFFF aqua
- #7FFFD4 aquamarine
- #F0FFFF azure
- #F5F5DC beige
- #FFE4C4 bisque
- #000000 black
- #FFEBCD blanchedalmond
- #0000FF blue
- #8A2BE2 blueviolet
- #A52A2A brown
- #DEB887 burlywood
- #5F9EA0 cadetblue
- #7FFF00 chartreuse
- #D2691E chocolate
- #FF7F50 coral
- #6495ED cornflowerblue
- #FFF8DC cornsilk
- #DC143C crimson
- #00FFFF cyan
- #00008B darkblue
- #008B8B darkcyan
- #B8860B darkgoldenrod
- #A9A9A9 darkgray
- #006400 darkgreen
- #A9A9A9 darkgrey
- #BDB76B darkkhaki
- #8B008B darkmagenta
- #556B2F darkolivegreen
- #FF8C00 darkorange
- #9932CC darkorchid
- #8B0000 darkred
- #E9967A darksalmon
- #8FBC8F darkseagreen
- #483D8B darkslateblue
- #2F4F4F darkslategray
- #2F4F4F darkslategrey
- #00CED1 darkturquoise
- #9400D3 darkviolet
- #FF1493 deeppink
- #00BFFF deepskyblue
- #696969 dimgray
- #696969 dimgrey
- #1E90FF dodgerblue
- #B22222 firebrick
- #FFFAF0 floralwhite
- #228B22 forestgreen
- #FF00FF fuchsia
- #DCDCDC gainsboro
- #F8F8FF ghostwhite
- #FFD700 gold
- #DAA520 goldenrod
- #808080 gray
- #008000 green
- #ADFF2F greenyellow
- #808080 grey
- #F0FFF0 honeydew
- #FF69B4 hotpink
- #CD5C5C indianred
- #4B0082 indigo
- #FFFFF0 ivory
- #F0E68C khaki
- #E6E6FA lavender
- #FFF0F5 lavenderblush
- #7CFC00 lawngreen
- #FFFACD lemonchiffon
- #ADD8E6 lightblue
- #F08080 lightcoral
- #E0FFFF lightcyan
- #FAFAD2 lightgoldenrodyellow
- #D3D3D3 lightgray
- #90EE90 lightgreen
- #D3D3D3 lightgrey
- #FFB6C1 lightpink
- #FFA07A lightsalmon
- #20B2AA lightseagreen
- #87CEFA lightskyblue
- #778899 lightslategray
- #778899 lightslategrey
- #B0C4DE lightsteelblue
- #FFFFE0 lightyellow
- #00FF00 lime
- #32CD32 limegreen
- #FAF0E6 linen
- #FF00FF magenta
- #800000 maroon
- #66CDAA mediumaquamarine
- #0000CD mediumblue
- #BA55D3 mediumorchid
- #9370DB mediumpurple
- #3CB371 mediumseagreen
- #7B68EE mediumslateblue
- #00FA9A mediumspringgreen
- #48D1CC mediumturquoise
- #C71585 mediumvioletred
- #191970 midnightblue
- #F5FFFA mintcream
- #FFE4E1 mistyrose
- #FFE4B5 moccasin
- #FFDEAD navajowhite
- #000080 navy
- #FDF5E6 oldlace
- #808000 olive
- #6B8E23 olivedrab
- #FFA500 orange
- #FF4500 orangered
- #DA70D6 orchid
- #EEE8AA palegoldenrod
- #98FB98 palegreen
- #AFEEEE paleturquoise
- #DB7093 palevioletred
- #FFEFD5 papayawhip
- #FFDAB9 peachpuff
- #CD853F peru
- #FFC0CB pink
- #DDA0DD plum
- #B0E0E6 powderblue
- #800080 purple
- #663399 rebeccapurple
- #FF0000 red
- #BC8F8F rosybrown
- #4169E1 royalblue
- #8B4513 saddlebrown
- #FA8072 salmon
- #F4A460 sandybrown
- #2E8B57 seagreen
- #FFF5EE seashell
- #A0522D sienna
- #C0C0C0 silver
- #87CEEB skyblue
- #6A5ACD slateblue
- #708090 slategray
- #708090 slategrey
- #FFFAFA snow
- #00FF7F springgreen
- #4682B4 steelblue
- #D2B48C tan
- #008080 teal
- #D8BFD8 thistle
- #FF6347 tomato
- #40E0D0 turquoise
- #EE82EE violet
- #F5DEB3 wheat
- #FFFFFF white
- #F5F5F5 whitesmoke
- #FFFF00 yellow
- #9ACD32 yellowgreen

<#! } #>
