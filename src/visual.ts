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
import { all_svgs } from "../style/trends/all";


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
    private heightSVG: number;
    private even_row: boolean;
    private columns: powerbi.DataViewCategoryColumn[];
    private values: powerbi.DataViewValueColumns;
    private allyears: string[];
    private data: any[];
    private datafinal: {};
    private studenti_totali = {};
    private studenti_ext_totali = {};
    private is_unige: boolean;
    private container: d3.Selection<HTMLDivElement, any, any, any>;
    private synTable: d3.Selection<HTMLTableElement, any, any, any>;
    private trends: number[];
    last_value: any;
    trend_incomplete: boolean;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.formattingSettingsService = new FormattingSettingsService();
        this.root = d3.select(options.element);
        this.svg = d3.select(options.element).append('svg');
        this.selectionManager = this.host.createSelectionManager();
        this.studenti_totali = {};
        this.studenti_ext_totali = {};
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

    public adjustVisualSettings() {
        this.visualSettings.stile.showTrendByCdS.visible = this.visualSettings.stile.showTrend.value
        this.visualSettings.stile.logoSize.visible = this.visualSettings.stile.showLogo.value;
    }

    public update(options: VisualUpdateOptions) {
        Object.prototype["keys"] = function () {
            return Object.keys(this)
        }
        this.options = options
        this.visualSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualSettings, options.dataViews[0]);
        this.adjustVisualSettings()
        this.setMarginAndDims();

        // Pulisci tutti gli elementi
        this.svg.selectAll("*").remove()
        let dataView: DataView = options.dataViews[0];

        // Creazione della tabella
        this.heightSVG = 80;
        this.root.selectAll("*").remove();
        this.container = this.root.append("div").style("width", "100%").style("height", "100%").style("display", "flex").style("flex-direction", "column")
        if (this.visualSettings.stile.showLogo.value == true) {
            this.svg = this.container.append("svg").style("width", "100%").style("height", this.heightSVG + "px").style("border-bottom", "1px solid black").style("box-sizing", "border-box")
            this.svg
                .append("image")
                .attr("xlink:href", "data:image/png;base64," + image)
                .attr("x", this.width - 70)  // Posizione X dell'immagine
                .attr("y", 0)  // Posizione Y dell'immagine
                //.attr("height", this.heightSVG)
                //.attr("width",this.heightSVG*1.66)
                .attr("width", this.visualSettings.stile.logoSize.value ? this.visualSettings.stile.logoSize.value : 300)  // Larghezza dell'immagine
                .attr("height", this.visualSettings.stile.logoSize.value ? this.visualSettings.stile.logoSize.value / 4 : 75);  // Altezza dell'immagine
        }
        let div = this.container.append("div").style("width", "100%").style("display", "flex").style("justify-content", "right")
        if (this.visualSettings.stile.showSyntTotalTable.value == true) {
            this.synTable = div.append("div").style("text-align", "right").style("display", "flex").style("justify-content", "right").style("padding-right", "20px").append("table").style("border-collapse", "collapse").attr("class", "syntable")
        }
        let table = this.container.append("div").attr("class", "table-container").style("height", this.visualSettings.stile.showLogo.value == true ? "calc(100% - " + this.heightSVG + "px)" : "100%").style("overflow-y", "scroll").append("table")
            .style("border-collapse", "collapse")
            .style("width", "100%")
            .style("height", "100%")

        // Creazione dell'header della tabella
        let thead_tr = table.append("thead").append("tr");
        this.data = []
        this.columns = dataView.categorical.categories
        this.values = dataView.categorical.values
        for (let i = 0; i < this.columns[0].values.length; i++) {
            this.data.push({})
        }
        for (let i = 0; i < this.columns.length; i++) {
            if (i > 0) {
                thead_tr.append("th").text(this.columns[i].source.displayName).attr("class", "cell header")
            }
            this.data[0][this.columns[i].source.displayName] = this.columns[i].values[0];
        }
        this.data[0][this.values[0].source.displayName] = 0;
        for (let i = 0; i < this.columns[0].values.length; i++) {
            for (let j = 0; j < this.columns.length; j++) {
                this.data[i][this.columns[j].source.displayName] = this.columns[j].values[i];
            }
            this.data[i][this.values[0].source.displayName] = dataView.categorical.values.grouped()[0].values[0].values[i]
        }
        this.data.sort((a, b) => {// ordino i dati prima per i valori testuali o altro, per ultimo gli anni accademici in ordine decrescente
            for (let i = 1; i < this.columns.length; i++) {
                let result = a[this.columns[i].source.displayName].localeCompare(b[this.columns[i].source.displayName]);
                if (result != 0) return result
            }
            let y1 = parseInt(a[this.columns[0].source.displayName].split("/")[0]);
            let y2 = parseInt(b[this.columns[0].source.displayName].split("/")[0]);
            return y2 - y1;
        })
        this.createDataFinal()
        this.allyears = (this.columns[0].values.filter((a, index, arr) => arr.indexOf(a) == index) as string[])
        this.allyears.sort((a, b) => {// ordino gli anni accademici in ordine decrescente
            let y1 = parseInt(a.split("/")[0]);
            let y2 = parseInt(b.split("/")[0]);
            if (y1 != y2) return y2 - y1;
        })
        for (let k of this.allyears) {
            thead_tr.append("th").text(k).attr("class", "cell header years")
        }
        if (this.visualSettings.stile.showTrend.value == true) {
            thead_tr.append("th").text("Trend ultimo triennio").attr("class", "cell header years")
        }

        this.even_row = false
        // Creazione del corpo della tabella
        var tbody = table.append("tbody");
        this.studenti_totali = {};
        this.studenti_ext_totali = {};
        this.populateTable([0], this.datafinal, tbody, tbody)
        if (this.visualSettings.stile.showSyntTotalTable.value == true) {
            this.populateSyntTable()
        }
    }

    public populateSyntTable() {
        let synt_thead_tr = this.synTable.append("thead").append("tr");
        synt_thead_tr.append("th")
        let synt_tbody = this.synTable.append("tbody")
        let synt_tbody_tr = synt_tbody.append("tr")
        synt_tbody_tr.append("td").text("Totale avvii di carriera degli studenti UniGe in classi di laurea dell'Area Politecnica").attr("class", "synt cell unige")
        if (this.visualSettings.stile.showTrend.value == true) {
            this.trends = []
        }
        for (let k of this.allyears) {
            synt_thead_tr.append("th").text(k).attr("class", "synt cell header years")
            synt_tbody_tr.append("td").text(this.studenti_totali[k]).attr("class", "synt cell value unige")
            if (this.visualSettings.stile.showTrend.value == true) {
                this.trends.push(this.studenti_totali[k])
            }
        }
        if (this.visualSettings.stile.showTrend.value == true) {
            synt_thead_tr.append("th").text("Trend ultimo triennio").attr("class", "synt cell header years").style("width", "79.92px").style("text-align", "center")
            this.is_unige = true
            this.getTrend(synt_tbody_tr.append("td"))
        }
        if (this.visualSettings.stile.showTrend.value == true) {
            this.trends = []
        }
        synt_tbody_tr = synt_tbody.append("tr")
        synt_tbody_tr.append("td").text("Di cui avvii di carriera fuori UniGe").attr("class", "synt cell extunige")
        for (let k of this.allyears) {
            synt_tbody_tr.append("td").text(this.studenti_ext_totali[k]).attr("class", "synt cell value extunige")
            if (this.visualSettings.stile.showTrend.value == true) {
                this.trends.push(this.studenti_ext_totali[k])
            }
        }
        if (this.visualSettings.stile.showTrend.value == true) {
            this.is_unige = false
            this.getTrend(synt_tbody_tr.append("td"))
        }
    }

    public createDataFinal() {
        this.datafinal = {}
        for (let i = 0; i < this.data.length; i++) {//la prima è l'anno accademico e quindi non mi serve, in attesa di sistemarlo
            let d = this.data[i]
            let keys = Object.keys(d)
            let row = this.datafinal;
            for (let k1 = 1; k1 < keys.length - 1; k1++) {
                let k = d[keys[k1]]
                if (row[k] == undefined) {
                    row[k] = {}
                }
                row = row[k]
            }
            row[d[keys[0]]] = d[keys[keys.length - 1]]
        }
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
    public populateTable(subtotal_displayed, row, htmlElem, tbody, deep = 0) {
        if (deep == this.columns.length - 1) {
            if (this.visualSettings.stile.showTrend.value == true) {
                this.trends = []
                this.last_value = undefined;
                this.trend_incomplete = false
            }
            for (let k2 of this.allyears) {
                if (this.visualSettings.stile.showTrendByCdS.value == true) {
                    let actualValue = row[k2] ?? " "
                    if (actualValue == " ") {
                        actualValue = 0;
                        this.trend_incomplete = true
                    }
                    this.trends.push(actualValue)
                }
                htmlElem.append("td").text(row[k2] ?? 0).attr("class", "cell value " + (this.even_row ? "even" : "odd"))
                if (!this.is_unige) {
                    this.studenti_ext_totali[k2] = this.studenti_ext_totali[k2] ? this.studenti_ext_totali[k2] + (row[k2] ?? 0) : (row[k2] ?? 0)
                }
                this.studenti_totali[k2] = this.studenti_totali[k2] ? this.studenti_totali[k2] + (row[k2] ?? 0) : (row[k2] ?? 0)
            }
            if (this.visualSettings.stile.showTrendByCdS.value == true) {
                //htmlElem.append("td").text(this.trends.filter(Number.isFinite).map((a,i,arr)=> arr[i-1]<a ? 1 : (arr[i-1]==a ? 0 : -1)).slice(1).join(" "))
                if (!this.trend_incomplete) {
                    this.getTrend(htmlElem.append("td"));
                }
            } else {
                htmlElem.append("td").attr("class", "nothing")
            }
            return
        }
        var inserted = false
        for (let k1index = 0; k1index < row.keys().length; k1index++) {
            let k1 = row.keys()[k1index];
            if (deep == 0) {
                this.even_row = !this.even_row;
                if (k1.toLowerCase().includes("unige") || k1.toLowerCase().includes("genova")) {
                    this.is_unige = true
                } else {
                    this.is_unige = false
                }
            }
            if (k1index > 0 && deep in subtotal_displayed) {
                htmlElem = tbody.append("tr")
            } else if (deep in subtotal_displayed) {
                htmlElem = htmlElem.append("tr")
            }
            if (inserted) {
                htmlElem = tbody.append("tr")
            }
            let rowspan = (deep == this.columns.length - 2 ? 1 : myMaxDeep(row[k1], deep, this.columns.length - 2));
            rowspan = rowspan > 0 ? (rowspan + (deep in subtotal_displayed ? 1 : 0)) : 1
            let td = htmlElem.append("td").text(k1).attr("class", "cell " + (this.even_row ? "even" : "odd")).attr("rowspan", rowspan).attr("deep", deep)
            inserted = true
            this.populateTable(subtotal_displayed, row[k1], htmlElem, tbody, deep + 1)
            if (deep in subtotal_displayed) {
                htmlElem = tbody.append("tr")
                htmlElem.append("td").text("Totale laureati UniGe che continuano la carriera universitaria presso " + k1.toUpperCase()).attr("class", "cell total " + (this.even_row ? "even" : "odd")).attr("colspan", this.columns.length - 2 - deep)
                let totale = []
                for (let year of this.allyears) {
                    totale.push(this.data.map(a => a[this.columns[0].source.displayName] == year && a[this.columns[deep + 1].source.displayName] == k1 ? a[this.values[0].source.displayName] : 0).reduce((a, b) => a + b, 0))
                }
                this.trends = [];
                for (let t of totale) {
                    if (this.visualSettings.stile.showTrend.value == true) {
                        this.trends.push(t)
                    }
                    htmlElem.append("td").text(t).attr("class", "cell value total")
                }
                if (this.visualSettings.stile.showTrend.value == true) {
                    this.getTrend(htmlElem.append("td"))
                } else {
                    htmlElem.append("td").attr("class", "nothing")
                }
            }
        }
    }

    private getTrend(htmlElem) {
        console.log("ehila")
        let trend = this.trends.filter(Number.isFinite).map((a, i, arr) => arr[i - 1] < a ? 1 : (arr[i - 1] == a ? 0 : -1)).slice(1);
        let result = "non_saprei"
        if (trend[0] === 0 && trend[1] === 0) {
            result = "Uguale"
        } else if (trend[0] === 0 && trend[1] === 1) {
            result = "Deb_in_decrescita"
        } else if (trend[0] === 0 && trend[1] === -1) {
            result = "Deb_in_crescita"
        } else if (trend[0] === 1 && trend[1] === 0) {
            result = "Debolmente_in_decrescita"
        } else if (trend[0] === 1 && trend[1] === 1) {
            result = "Fortemente_in_decrescita"
        } else if (trend[0] === 1 && trend[1] === -1) {
            result = "Altalenante_in_decrescita"
        } else if (trend[0] === -1 && trend[1] === -1) {
            result = "Fortemente_in_crescita"
        } else if (trend[0] === -1 && trend[1] === 0) {
            result = "Debolmente_in_crescita"
        } else if (trend[0] === -1 && trend[1] === 1) {
            result = "Altalenante_in_crescita"
        }
        if (result == "Uguale") {
            htmlElem.attr("class", "cell value").text("==")
        } else {
            htmlElem.attr("class", `cell value ${result} is_unige_${this.is_unige}`)
        }
        /*const svg = htmlElem.append("svg").attr("width",100).attr("height",100).attr("viewBox","0 0 100 100").attr("xmlns","http://www.w3.org/2000/svg")
        svg.html(all_svgs)

        // Nascondi tutti i path
        svg.selectAll(":scope > *:not(defs)").style("display", "none");
        let result = "non saprei"
        if (trend[0] === 0 && trend[1] === 0) {
            result = "Uguale"
        } else if (trend[0] === 0 && trend[1] === 1) {
            result = "Deb_in_crescita"
        } else if (trend[0] === 0 && trend[1] === -1) {
            result = "Deb_in_decrescita"
        } else if (trend[0] === 1 && trend[1] === 0) {
            result = "Debolmente_in_crescita"
        } else if (trend[0] === 1 && trend[1] === 1) {
            result = "Fortemente_in_crescita"
        } else if (trend[0] === 1 && trend[1] === -1) {
            result = "Altalenante_in_decrescita"
        } else if (trend[0] === -1 && trend[1] === -1) {
            result = "Fortemente_in_decrescita"
        } else if (trend[0] === -1 && trend[1] === 0) {
            result = "Debolmente_in_decrescita"
        } else if (trend[0] === -1 && trend[1] === 1) {
            result = "Altalenante_in_crescita"
        }
        if (result != "non saprei") {
            svg.select(`:scope > #${result}`).style("display", "block")
        }*/
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