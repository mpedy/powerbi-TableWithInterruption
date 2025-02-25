/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
"use strict";

import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import { VisualSettings } from "./settings";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import FormattingModel = powerbi.visuals.FormattingModel;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import DataView = powerbi.DataView;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import * as d3 from "d3";
import { image } from "./unige_image";
import { myMaxDeep } from "./Utils";


type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

export class Visual implements IVisual {
    private host: IVisualHost;
    private root: Selection<HTMLElement>;
    private svg: Selection<SVGElement>;
    private width: number;
    private height: number;
    private margin = { top: 30, right: 100, bottom: 50 + 120, left: 30, xAxistop: 15 };
    private options: VisualUpdateOptions;
    private selectionManager: ISelectionManager;
    private visualSettings: VisualSettings;
    private formattingSettingsService: FormattingSettingsService;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.formattingSettingsService = new FormattingSettingsService();
        this.root = d3.select(options.element);
        this.svg = d3.select(options.element).append('svg');
        this.selectionManager = this.host.createSelectionManager();
    }

    public getTextWidth(text: string, font?: any) {
        // Crea un elemento span temporaneo
        const span = document.createElement("span");
        span.style.visibility = "hidden";
        span.style.position = "absolute";
        span.style.whiteSpace = "nowrap"; // Impedisce il testo a capo
        if (font !== undefined) {
            span.style.font = font; // Imposta lo stile del font come l'elemento originale
        }
        span.innerText = text;

        // Aggiungi lo span al documento per misurarne la larghezza
        document.body.appendChild(span);
        const width = span.offsetWidth;

        // Rimuovi lo span dal DOM
        document.body.removeChild(span);

        return width;
    }

    public getFormattingModel(): FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.visualSettings);
    }

    public setMarginAndDims() {
        if (this.visualSettings.stile.showLogo.value == false) {
            this.margin.right = 0;
        } else {
            this.margin.right = 100;
        }
        this.width = this.options.viewport.width - this.margin.left - this.margin.right;
        this.height = this.options.viewport.height - this.margin.top - this.margin.bottom;
    }

    public update(options: VisualUpdateOptions) {
        Object.prototype["keys"] = function () {
            return Object.keys(this)
        }
        this.options = options
        this.visualSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualSettings, options.dataViews[0]);
        this.setMarginAndDims();

        // Pulisci tutti gli elementi
        this.svg.selectAll("*").remove()
        let dataView: DataView = options.dataViews[0];

        // Creazione della tabella
        this.root.selectAll("*").remove();
        let div = this.root.append("div")
        div.style("height", "100%").style("overflow", "scroll")
        let table = div.append("table")
            .style("border-collapse", "collapse")
            .style("width", "100%")

        // Creazione dell'header della tabella
        let thead_tr = table.append("thead").append("tr");
        var data = []
        let columns = dataView.categorical.categories
        let values = dataView.categorical.values
        for (let i = 0; i < columns[0].values.length; i++) {
            data.push({})
        }
        for (let i = 0; i < columns.length; i++) {
            if (i > 0) {
                thead_tr.append("th").text(columns[i].source.displayName).attr("class","cell header")
            }
            data[0][columns[i].source.displayName] = columns[i].values[0];
        }
        data[0][values[0].source.displayName] = 0;
        for (let i = 0; i < columns[0].values.length; i++) {
            for (let j = 0; j < columns.length; j++) {
                data[i][columns[j].source.displayName] = columns[j].values[i];
            }
            data[i][values[0].source.displayName] = dataView.categorical.values.grouped()[0].values[0].values[i]
        }
        data.sort((a, b) => {// ordino i dati prima per i valori testuali o altro, per ultimo gli anni accademici in ordine decrescente
            for (let i = 1; i < columns.length; i++) {
                let result = a[columns[i].source.displayName].localeCompare(b[columns[i].source.displayName]);
                if (result != 0) return result
            }
            let y1 = parseInt(a[columns[0].source.displayName].split("/")[0]);
            let y2 = parseInt(b[columns[0].source.displayName].split("/")[0]);
            return y2 - y1;
        })
        let datafinal = {}
        for (let i = 0; i < data.length; i++) {//la prima è l'anno accademico e quindi non mi serve, in attesa di sistemarlo
            let d = data[i]
            let keys = Object.keys(d)
            let row = datafinal;
            for (let k1 = 1; k1 < keys.length - 1; k1++) {
                let k = d[keys[k1]]
                if (row[k] == undefined) {
                    row[k] = {}
                }
                row = row[k]
            }
            row[d[keys[0]]] = d[keys[keys.length - 1]]
        }
        var allyears = (columns[0].values.filter((a, index, arr) => arr.indexOf(a) == index) as string[])
        allyears.sort((a, b) => {// ordino gli anni accademici in ordine decrescente
            let y1 = parseInt(a.split("/")[0]);
            let y2 = parseInt(b.split("/")[0]);
            if (y1 != y2) return y2 - y1;
        })
        for (let k of allyears) {
            thead_tr.append("th").text(k).attr("class","cell header years")
        }
        /**
         * 
         * @param subtotal_displayed index della colonna per cui far visualizzare i totali
         * @param row dataset dei dati
         * @param htmlElem elemento HTML in cui inserire i dati
         * @param tbody riferimento al tbody della table per cui occorre inserire nuovi elementi TR; htmlElem si modificherà di conseguenza
         * @param deep riferimento alla profondità ricorsiva a cui si è arrivati
         * @returns nulla
         */
        var populateTable = function (subtotal_displayed, row, htmlElem, tbody, deep = 0) {
            if (deep == columns.length - 1) {
                for (let k2 of allyears) {
                    htmlElem.append("td").text(row[k2] ?? " ").attr("class", "cell value")
                }
                return
            }
            var inserted = false
            for (let k1index = 0; k1index < row.keys().length; k1index++) {
                /*if (k1index > 0) {
                    let indexes = rowspan["keys"]().map(a => parseInt(a));
                     for (let deep1 = deep + 1; deep1 <= Math.max(...indexes); deep1++) {
                        delete rowspan[deep1];
                    }
                }*/
                /* if (deep == 0) {
                    rowspan = {};
                } */
                let k1 = row.keys()[k1index];
                if (k1index > 0 && deep in subtotal_displayed) {
                    htmlElem = tbody.append("tr")
                } else if (deep in subtotal_displayed) {
                    htmlElem = htmlElem.append("tr")
                }
                if (inserted) {
                    htmlElem = tbody.append("tr")
                }
                let prova = deep == columns.length - 2 ? 1 : myMaxDeep(row[k1], deep, columns.length - 2);
                prova = prova > 0 ? (prova + (deep in subtotal_displayed ? 1 : 0)) : 1
                let td = htmlElem.append("td").text(k1).attr("class", "cell").attr("rowspan", prova)
                debugger;
                inserted = true
                if (columns.length > 2 && deep in subtotal_displayed) {
                    //td.attr("rowspan", row[k1].keys().length + 1)
                } else {
                    if (deep != columns.length - 2) {
                        //td.attr("rowspan", row[k1].keys().length)
                    }
                }
                populateTable(subtotal_displayed, row[k1], htmlElem, tbody, deep + 1)
                if (deep in subtotal_displayed) {
                    htmlElem = tbody.append("tr")
                    htmlElem.append("td").text("Totale per " + k1).attr("class", "cell total").attr("colspan", columns.length - 2 - deep)
                    let totale = []
                    for (let year of allyears) {
                        totale.push(data.map(a => a[columns[0].source.displayName] == year && a[columns[deep + 1].source.displayName] == k1 ? a[values[0].source.displayName] : 0).reduce((a, b) => a + b, 0))
                    }
                    for (let t of totale) {
                        htmlElem.append("td").text(t).attr("class", "cell value total")
                    }
                }
            }
        }

        // Creazione del corpo della tabella
        var tbody = table.append("tbody");
        populateTable([0], datafinal, tbody, tbody)

        if (this.visualSettings.stile.showLogo.value == true) {
            this.svg
                .append("image")
                .attr("xlink:href", "data:image/png;base64," + image)
                .attr("x", this.width - 70)  // Posizione X dell'immagine
                .attr("y", 0)  // Posizione Y dell'immagine
                .attr("width", this.visualSettings.stile.logoSize.value ? this.visualSettings.stile.logoSize.value : 300)  // Larghezza dell'immagine
                .attr("height", this.visualSettings.stile.logoSize.value ? this.visualSettings.stile.logoSize.value / 4 : 75);  // Altezza dell'immagine
        }
    }

    // Funzione per spezzare le etichette troppo lunghe
    private wrap(text, width) {
        text.each(function () {
            const text = d3.select(this);
            const words = text.text().split(/\s+/).reverse(); // Divide l'etichetta in parole
            const manyword = words.length;
            let word;
            let line: string[] = [];
            let lineNumber = 0;
            const lineHeight = 1.3; // Altezza della linea (em)
            const y = text.attr("y");
            const dy = parseFloat(text.attr("dy") || ".35em");
            let tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");

            // Raggruppa le parole dentro il tspan
            while ((word = words.pop())) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node()!.getComputedTextLength() > width && manyword > 1) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                }
            }
        });
    }
}