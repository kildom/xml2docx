# Templates

The input file is a template.

Template can both interpolate values, using `<%= … %>`,
as well as execute arbitrary code, with `<% … %>`.
If you wish to interpolate value with XML-escaping, use `<%- … %>`.
The **JavaScript** is used in both interpolation and execution.

Content of data file is directly accessible in the template.
For example, if your data file is `{name: "John"}` and your template is `Hello <%- name %>!`,
then you will get `Hello John!`.

