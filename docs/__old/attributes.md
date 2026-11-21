## Attribute values

Some XML attributes contains common values that are
described below.

### Boolean value

The table below shows all possible strings representing
`true` or `false` value (case insensitive).

True Value | False Value
-----------|------------
true       | false
t          | f
yes        | no
y          | n
1          | 0
on         | off

Example:

```xml
<font bold="y">Bold text</font>
```

### Universal measure

Universal measures are represented as number followed by unit name.
All allowed units are summarized below.

   Unit   | Unit length in millimeters | Unit length in inches
----------|----------------------------|-----------------------
 **mm**   | 1                          | 5/127 ≈ 0.03937
 **cm**   | 10                         | 50/127 ≈ 0.3937
 **in**   | 127/5 = 25.4               | 1
 **pt**   | 127/360 ≈ 0.3528           | 1/72 ≈ 0.01389
 **pi**   | 127/30 ≈ 4.233             | 1/6 ≈ 0.1667
 **pc**   | 127/30 ≈ 4.233             | 1/6 ≈ 0.1667
 **px**   | 127/480 ≈ 0.2646           | 1/96 ≈ 0.01042

Example:

```xml
<img width="10cm" height="13cm" src="cat.jpeg"/>
```

#### Positive universal measure

Positive universal measure is similar to [Universal measure](#universal-measure) except that the negative numbers are not allowed.

### Color

Color is represented as:
* HTML 6 digit hex number preceded by `#` character,
* HTML 3 digit hex number preceded by `#` character,
* CSS color name.

<table>
<tr><td>
<div class="color"><b style="background-color: #F0F8FF"></b>aliceblue</div>
<div class="color"><b style="background-color: #FAEBD7"></b>antiquewhite</div>
<div class="color"><b style="background-color: #00FFFF"></b>aqua</div>
<div class="color"><b style="background-color: #7FFFD4"></b>aquamarine</div>
<div class="color"><b style="background-color: #F0FFFF"></b>azure</div>
<div class="color"><b style="background-color: #F5F5DC"></b>beige</div>
<div class="color"><b style="background-color: #FFE4C4"></b>bisque</div>
<div class="color"><b style="background-color: #000000"></b>black</div>
<div class="color"><b style="background-color: #FFEBCD"></b>blanchedalmond</div>
<div class="color"><b style="background-color: #0000FF"></b>blue</div>
<div class="color"><b style="background-color: #8A2BE2"></b>blueviolet</div>
<div class="color"><b style="background-color: #A52A2A"></b>brown</div>
<div class="color"><b style="background-color: #DEB887"></b>burlywood</div>
<div class="color"><b style="background-color: #5F9EA0"></b>cadetblue</div>
<div class="color"><b style="background-color: #7FFF00"></b>chartreuse</div>
<div class="color"><b style="background-color: #D2691E"></b>chocolate</div>
<div class="color"><b style="background-color: #FF7F50"></b>coral</div>
<div class="color"><b style="background-color: #6495ED"></b>cornflowerblue</div>
<div class="color"><b style="background-color: #FFF8DC"></b>cornsilk</div>
<div class="color"><b style="background-color: #DC143C"></b>crimson</div>
<div class="color"><b style="background-color: #00FFFF"></b>cyan</div>
<div class="color"><b style="background-color: #00008B"></b>darkblue</div>
<div class="color"><b style="background-color: #008B8B"></b>darkcyan</div>
<div class="color"><b style="background-color: #B8860B"></b>darkgoldenrod</div>
<div class="color"><b style="background-color: #A9A9A9"></b>darkgray</div>
<div class="color"><b style="background-color: #006400"></b>darkgreen</div>
<div class="color"><b style="background-color: #A9A9A9"></b>darkgrey</div>
<div class="color"><b style="background-color: #BDB76B"></b>darkkhaki</div>
<div class="color"><b style="background-color: #8B008B"></b>darkmagenta</div>
<div class="color"><b style="background-color: #556B2F"></b>darkolivegreen</div>
<div class="color"><b style="background-color: #FF8C00"></b>darkorange</div>
<div class="color"><b style="background-color: #9932CC"></b>darkorchid</div>
<div class="color"><b style="background-color: #8B0000"></b>darkred</div>
<div class="color"><b style="background-color: #E9967A"></b>darksalmon</div>
<div class="color"><b style="background-color: #8FBC8F"></b>darkseagreen</div>
<div class="color"><b style="background-color: #483D8B"></b>darkslateblue</div>
<div class="color"><b style="background-color: #2F4F4F"></b>darkslategray</div>
</td><td>
<div class="color"><b style="background-color: #2F4F4F"></b>darkslategrey</div>
<div class="color"><b style="background-color: #00CED1"></b>darkturquoise</div>
<div class="color"><b style="background-color: #9400D3"></b>darkviolet</div>
<div class="color"><b style="background-color: #FF1493"></b>deeppink</div>
<div class="color"><b style="background-color: #00BFFF"></b>deepskyblue</div>
<div class="color"><b style="background-color: #696969"></b>dimgray</div>
<div class="color"><b style="background-color: #696969"></b>dimgrey</div>
<div class="color"><b style="background-color: #1E90FF"></b>dodgerblue</div>
<div class="color"><b style="background-color: #B22222"></b>firebrick</div>
<div class="color"><b style="background-color: #FFFAF0"></b>floralwhite</div>
<div class="color"><b style="background-color: #228B22"></b>forestgreen</div>
<div class="color"><b style="background-color: #FF00FF"></b>fuchsia</div>
<div class="color"><b style="background-color: #DCDCDC"></b>gainsboro</div>
<div class="color"><b style="background-color: #F8F8FF"></b>ghostwhite</div>
<div class="color"><b style="background-color: #FFD700"></b>gold</div>
<div class="color"><b style="background-color: #DAA520"></b>goldenrod</div>
<div class="color"><b style="background-color: #808080"></b>gray</div>
<div class="color"><b style="background-color: #008000"></b>green</div>
<div class="color"><b style="background-color: #ADFF2F"></b>greenyellow</div>
<div class="color"><b style="background-color: #808080"></b>grey</div>
<div class="color"><b style="background-color: #F0FFF0"></b>honeydew</div>
<div class="color"><b style="background-color: #FF69B4"></b>hotpink</div>
<div class="color"><b style="background-color: #CD5C5C"></b>indianred</div>
<div class="color"><b style="background-color: #4B0082"></b>indigo</div>
<div class="color"><b style="background-color: #FFFFF0"></b>ivory</div>
<div class="color"><b style="background-color: #F0E68C"></b>khaki</div>
<div class="color"><b style="background-color: #E6E6FA"></b>lavender</div>
<div class="color"><b style="background-color: #FFF0F5"></b>lavenderblush</div>
<div class="color"><b style="background-color: #7CFC00"></b>lawngreen</div>
<div class="color"><b style="background-color: #FFFACD"></b>lemonchiffon</div>
<div class="color"><b style="background-color: #ADD8E6"></b>lightblue</div>
<div class="color"><b style="background-color: #F08080"></b>lightcoral</div>
<div class="color"><b style="background-color: #E0FFFF"></b>lightcyan</div>
<div class="color"><b style="background-color: #FAFAD2"></b>lightgoldenrodyellow</div>
<div class="color"><b style="background-color: #D3D3D3"></b>lightgray</div>
<div class="color"><b style="background-color: #90EE90"></b>lightgreen</div>
<div class="color"><b style="background-color: #D3D3D3"></b>lightgrey</div>
</td><td>
<div class="color"><b style="background-color: #FFB6C1"></b>lightpink</div>
<div class="color"><b style="background-color: #FFA07A"></b>lightsalmon</div>
<div class="color"><b style="background-color: #20B2AA"></b>lightseagreen</div>
<div class="color"><b style="background-color: #87CEFA"></b>lightskyblue</div>
<div class="color"><b style="background-color: #778899"></b>lightslategray</div>
<div class="color"><b style="background-color: #778899"></b>lightslategrey</div>
<div class="color"><b style="background-color: #B0C4DE"></b>lightsteelblue</div>
<div class="color"><b style="background-color: #FFFFE0"></b>lightyellow</div>
<div class="color"><b style="background-color: #00FF00"></b>lime</div>
<div class="color"><b style="background-color: #32CD32"></b>limegreen</div>
<div class="color"><b style="background-color: #FAF0E6"></b>linen</div>
<div class="color"><b style="background-color: #FF00FF"></b>magenta</div>
<div class="color"><b style="background-color: #800000"></b>maroon</div>
<div class="color"><b style="background-color: #66CDAA"></b>mediumaquamarine</div>
<div class="color"><b style="background-color: #0000CD"></b>mediumblue</div>
<div class="color"><b style="background-color: #BA55D3"></b>mediumorchid</div>
<div class="color"><b style="background-color: #9370DB"></b>mediumpurple</div>
<div class="color"><b style="background-color: #3CB371"></b>mediumseagreen</div>
<div class="color"><b style="background-color: #7B68EE"></b>mediumslateblue</div>
<div class="color"><b style="background-color: #00FA9A"></b>mediumspringgreen</div>
<div class="color"><b style="background-color: #48D1CC"></b>mediumturquoise</div>
<div class="color"><b style="background-color: #C71585"></b>mediumvioletred</div>
<div class="color"><b style="background-color: #191970"></b>midnightblue</div>
<div class="color"><b style="background-color: #F5FFFA"></b>mintcream</div>
<div class="color"><b style="background-color: #FFE4E1"></b>mistyrose</div>
<div class="color"><b style="background-color: #FFE4B5"></b>moccasin</div>
<div class="color"><b style="background-color: #FFDEAD"></b>navajowhite</div>
<div class="color"><b style="background-color: #000080"></b>navy</div>
<div class="color"><b style="background-color: #FDF5E6"></b>oldlace</div>
<div class="color"><b style="background-color: #808000"></b>olive</div>
<div class="color"><b style="background-color: #6B8E23"></b>olivedrab</div>
<div class="color"><b style="background-color: #FFA500"></b>orange</div>
<div class="color"><b style="background-color: #FF4500"></b>orangered</div>
<div class="color"><b style="background-color: #DA70D6"></b>orchid</div>
<div class="color"><b style="background-color: #EEE8AA"></b>palegoldenrod</div>
<div class="color"><b style="background-color: #98FB98"></b>palegreen</div>
<div class="color"><b style="background-color: #AFEEEE"></b>paleturquoise</div>
</td><td>
<div class="color"><b style="background-color: #DB7093"></b>palevioletred</div>
<div class="color"><b style="background-color: #FFEFD5"></b>papayawhip</div>
<div class="color"><b style="background-color: #FFDAB9"></b>peachpuff</div>
<div class="color"><b style="background-color: #CD853F"></b>peru</div>
<div class="color"><b style="background-color: #FFC0CB"></b>pink</div>
<div class="color"><b style="background-color: #DDA0DD"></b>plum</div>
<div class="color"><b style="background-color: #B0E0E6"></b>powderblue</div>
<div class="color"><b style="background-color: #800080"></b>purple</div>
<div class="color"><b style="background-color: #663399"></b>rebeccapurple</div>
<div class="color"><b style="background-color: #FF0000"></b>red</div>
<div class="color"><b style="background-color: #BC8F8F"></b>rosybrown</div>
<div class="color"><b style="background-color: #4169E1"></b>royalblue</div>
<div class="color"><b style="background-color: #8B4513"></b>saddlebrown</div>
<div class="color"><b style="background-color: #FA8072"></b>salmon</div>
<div class="color"><b style="background-color: #F4A460"></b>sandybrown</div>
<div class="color"><b style="background-color: #2E8B57"></b>seagreen</div>
<div class="color"><b style="background-color: #FFF5EE"></b>seashell</div>
<div class="color"><b style="background-color: #A0522D"></b>sienna</div>
<div class="color"><b style="background-color: #C0C0C0"></b>silver</div>
<div class="color"><b style="background-color: #87CEEB"></b>skyblue</div>
<div class="color"><b style="background-color: #6A5ACD"></b>slateblue</div>
<div class="color"><b style="background-color: #708090"></b>slategray</div>
<div class="color"><b style="background-color: #708090"></b>slategrey</div>
<div class="color"><b style="background-color: #FFFAFA"></b>snow</div>
<div class="color"><b style="background-color: #00FF7F"></b>springgreen</div>
<div class="color"><b style="background-color: #4682B4"></b>steelblue</div>
<div class="color"><b style="background-color: #D2B48C"></b>tan</div>
<div class="color"><b style="background-color: #008080"></b>teal</div>
<div class="color"><b style="background-color: #D8BFD8"></b>thistle</div>
<div class="color"><b style="background-color: #FF6347"></b>tomato</div>
<div class="color"><b style="background-color: #40E0D0"></b>turquoise</div>
<div class="color"><b style="background-color: #EE82EE"></b>violet</div>
<div class="color"><b style="background-color: #F5DEB3"></b>wheat</div>
<div class="color"><b style="background-color: #FFFFFF"></b>white</div>
<div class="color"><b style="background-color: #F5F5F5"></b>whitesmoke</div>
<div class="color"><b style="background-color: #FFFF00"></b>yellow</div>
<div class="color"><b style="background-color: #9ACD32"></b>yellowgreen</div>
</td></tr>
</table>
