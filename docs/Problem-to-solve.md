
# Problem with implicit elements combined with groups


```
<p></p>
<group font.size="12pt">
<font>abc</font>
</group>
def
<p>test</p>


<p></p>
<group#begin>
<p></p>
<font>abc</font>
<group#end>
def
<p>test</p>


123
<group#begin>
<font>abc</font>
<p>test</p>
<group#end>
```

For example in <td>:
1. Does the group has <p> or <table>
   * yes - put group in <td> and interpret content recursively
   * no - continue with pt. 2
2. Does the group is alone inside a chunk
   * yes - put group in <td> and interpret content recursively
   * no - put group into the implicit <p>