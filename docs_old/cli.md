# Command line arguments

USAGE:
```sh
xml2docx [options] <input.xml> [output.docx]
```

Options:

* `<input.xml>`

    Input XML file.

* `[output.docx]`

    Output document. By default it is `<input>` with `.docx` extension.

* `-d <data.json5>`

    Interpret the input file as a template and use the `<data.json5>` file for
    template input data.

    See [Templates](template.md#templates) for details.

> [!CAUTION]
> ACTIVATING THIS OPTION WILL PERMIT THE EXECUTION OF ARBITRARY
> CODE FROM THE `<input.xml>` FILE WITHOUT LIMITATIONS. USE ONLY
> XML FILES FROM A TRUSTED SOURCE.

* `--debug`

    Dump intermediate files alongside the output after each step of
    processing and show more verbose output in case of errors. This option
    is mainly useful when debugging the template or the tool.

* `--help`
  
    Command line help.

* `--license`

    Show license information.

* `--sources`

    Dump source files to a `_src` directory (for debug only).
