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
import { BoxPlotData, calculateBoxPlotData, percentile } from "./boxplotdata"
import DataView = powerbi.DataView;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import * as d3 from "d3";
import { image } from "./unige_image";
import { dataViewObjects } from "powerbi-visuals-utils-dataviewutils";
import DataViewObjectPropertyIdentifier = powerbi.DataViewObjectPropertyIdentifier;
import Fill = powerbi.Fill;
import { ThresholdLines } from "./thresholdLines";
import { tableData } from "./tableData";

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
    //private tooltipServiceWrapper: ITooltipServiceWrapper;
    private boxPlotData: BoxPlotData[] = [];
    private boxPlotData_dip: BoxPlotData[] = [];
    private boxPlotData_cds: BoxPlotData[] = [];
    private questionariBianchi: number = 0;
    private questionariCompilati: number = 0;
    private colors = {
        "CONOSCENZE": "#008fd3",
        "CARICO DI STUDIO": "#99d101",
        "MATERIALE DIDATTICO": "#f39b02",
        "MOD ESAME": "#9fcfec",
        "SODDISFAZIONE": "#4ba707",
        "ORARI": "#f6d133",
        "DOC STIMOLA": "#cb4d2c",
        "DOC ESPONE": "#cac7ba",
        "ATT. INTEGRATIVE": "#0d869c",
        "COERENZA": "#cdd72e",
        "DOC REPERIBILE": "#247230",
        "INTERESSE": "#6cdedc"
    }
    private asseX: d3.ScaleBand<string>;
    private asseY: d3.ScaleLinear<number, number, never>;
    private visualSettings: VisualSettings;
    private formattingSettingsService: FormattingSettingsService;
    private thresholdLines: ThresholdLines[] = [];
    private buttonContainer: d3.Selection<HTMLDivElement, any, any, any>;
    private btn_solo_cds: d3.Selection<HTMLButtonElement, any, any, any>;
    private btn_solo_dip: d3.Selection<HTMLButtonElement, any, any, any>;
    private btn_all: d3.Selection<HTMLButtonElement, any, any, any>;
    private filter_all: boolean = true;
    private filter_dip: boolean = false;
    private filter_cds: boolean = false;
    private numberOfIns: number = 0;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.formattingSettingsService = new FormattingSettingsService();
        console.log("Visual build options", options)
        console.log("Salvato", this.options)
        this.root = d3.select(options.element);
        this.insertStyle()
        this.buttonContainer = this.root.append("div");
        this.svg = d3.select(options.element).append('svg');
        this.selectionManager = this.host.createSelectionManager();
        this.handleContextMenu();
        //this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);
    }

    public insertStyle() {
        /*this.root.append("style").text(`
            @font-face {
                font-family: 'Fira Sans';
                src: url('./style/fonts/Fira_Sans/FiraSans-Regular.ttf') format('truetype');
                font-weight: normal;
                font-style: normal;
            }
            .custom-font {
                font-family: 'Fira Sans', sans-serif;
            }
            .cell{
                font-family: 'Fira Sans', sans-serif;
                font-size: 16px;
                border: 1px solid black;
            }
            .cell.total{
                font-weight: bold;
            }
        `);*/
    }

    public createTextbox() {
        let div = this.buttonContainer
            .append("div")
            .style("display", "flex")
            .style("flex-direction", "row")
        div.append("div")
            .style("flex-grow", 1)
            .style("justify-content", "center")
            .style("align-items", "center")
            .style("display", "flex")
            .style("flex-direction", "column")
            .html(`<span style="text-align: center"><h1 style="margin: 10px 0px;">${this.numberOfIns}</h1>Numero insegnamenti valutati</span>`)
        div.append("div")
            .style("flex-grow", 1)
            .style("justify-content", "center")
            .style("align-items", "center")
            .style("display", "flex")
            .style("flex-direction", "column")
            .html(`<span style="text-align: center"><h1 style="margin: 10px 0px;">${this.questionariCompilati}</h1>Questionari compilati</span>`)
        div.append("div")
            .style("flex-grow", 1)
            .style("justify-content", "center")
            .style("align-items", "center")
            .style("display", "flex")
            .style("flex-direction", "column")
            .html(`<span style="text-align: center"><h1 style="margin: 10px 0px;">${this.questionariBianchi}</h1>Questionari bianchi</span>`)
    }

    private handleContextMenu() {
        this.svg.on('contextmenu', (event: PointerEvent, dataPoint) => {
            console.log("ciao")
            this.selectionManager.showContextMenu(dataPoint ? dataPoint : {}, {
                x: event.clientX,
                y: event.clientY
            });
            event.preventDefault();
        });
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

    public displayTooltip(event, d) {
        var secondColumnWidth = d3.max([this.getTextWidth(d.area, undefined) + 5, 110]);
        this.root.append("div")
            .attr("id", "tooltip")
            .style("background-color", "white")
            .style("position", "absolute")
            .style("border", "1px solid black")
            .style("border-radius", "10px")
            .style("top", event.clientY + 10 + "px")
            .style("left", event.clientX + 20 + "px")
            .append("div")
            .style("display", "grid")
            .style("grid-template-columns", `140px ${secondColumnWidth}px`)
            .style("padding", "10px")
            .html(`
                <span style="text-align: end;margin-right: 8px;">AREA: </span><span>${d.area}</span>
                <span style="text-align: end;margin-right: 8px;">Media: </span><span>${d.mean.toFixed(2) + " %"}</span>
                <span style="text-align: end;margin-right: 8px;">Mediana: </span><span>${d.median.toFixed(2) + " %"}</span>
                <span style="text-align: end;margin-right: 8px;">Q1: </span><span>${d.q1.toFixed(2) + " %"}</span>
                <span style="text-align: end;margin-right: 8px;">Q3: </span><span>${d.q3.toFixed(2) + " %"}</span>
                <span style="text-align: end;margin-right: 8px;">Lower Bound: </span><span>${d.lower_bound.toFixed(2) + " %"}</span>
                <span style="text-align: end;margin-right: 8px;">Upper Bound: </span><span>${d.upper_bound.toFixed(2) + " %"}</span>
                <span style="text-align: end;margin-right: 8px;">Outliers inferiori: </span><span>${d.outliers_inf.length}</span>
                <span style="text-align: end;margin-right: 8px;">Outliers superiori: </span><span>${d.outliers_sup.length}</span>
            `)
        const tooltip = document.getElementById("tooltip")
        const clientrects = tooltip.getClientRects()[0]
        if (clientrects.x + clientrects.width > document.documentElement.getClientRects()[0].width) {
            console.log("Siamo dentro")
            this.root.select("#tooltip").style("left", event.clientX - 20 - clientrects.width + "px")
        }
    }

    public getDataFromDataview(dataView: DataView) {
        this.boxPlotData = [];
        this.boxPlotData_dip = [];
        this.boxPlotData_cds = [];
        this.questionariBianchi = 0;
        this.questionariCompilati = 0;
        let flag_quest_bianchi = false, flag_quest_compilati = false;
        const areas = dataView.categorical.categories[0].values
        var indexArea = 0;
        for (var indexArea = 0; indexArea < areas.length; indexArea++) {
            const area = <string>areas[indexArea];
            let color = this.getColorFromObject(area, dataView, indexArea);
            const categorySelectionId = this.host.createSelectionIdBuilder()
                .withCategory(dataView.categorical.categories[0], indexArea) // Una sola categoria ("Area Domanda")
                .createSelectionId();
            let datas = dataView.categorical.values.grouped();
            if (datas.length > 1) {
                if (datas[0].values.length > 1 && !flag_quest_bianchi) {
                    this.questionariBianchi = <number>datas.map(data => data.values[1]).map(data => data.values[0])[0]
                    flag_quest_bianchi = true
                }
                if (datas[0].values.length > 2 && !flag_quest_compilati) {
                    this.questionariCompilati = <number>datas.map(data => data.values[2]).map(data => data.values[0])[0]
                    flag_quest_compilati = true
                }
            }
            let datas1 = dataView.categorical.values.filter(i => i.source.queryName.indexOf("giudizi positivi") >= 0)
            const values_all = <number[]>datas1.map(child => <number>child.values[indexArea] * 100);
            const data_all = calculateBoxPlotData(values_all, area, categorySelectionId, color);
            this.boxPlotData.push(data_all);
            const values_dip = <number[]>datas1.filter(child => (<string>child.source.groupName).split("_")[0] == "SI").map(child => <number>child.values[indexArea] * 100);
            const data_dip = calculateBoxPlotData(values_dip, area, categorySelectionId, color);
            this.boxPlotData_dip.push(data_dip)
            const values_cds = <number[]>datas1.filter(child => (<string>child.source.groupName).split("_")[1] == "SI").map(child => <number>child.values[indexArea] * 100);
            const data_cds = calculateBoxPlotData(values_cds, area, categorySelectionId, color);
            this.boxPlotData_cds.push(data_cds)
        }
    }

    public getColorFromObject(area: string, dataView: powerbi.DataView, indexArea: number) {
        const defaultColor: Fill = {
            solid: {
                color: this.colors[area],
            }
        };
        const prop: DataViewObjectPropertyIdentifier = {
            objectName: "colorSelector",
            propertyName: "fill"
        };

        let colorFromObjects: Fill;
        if (dataView.categorical.categories[0].objects?.[indexArea]) {
            colorFromObjects = dataViewObjects.getValue(dataView.categorical.categories[0]?.objects[indexArea], prop);
        }

        let color = colorFromObjects?.solid.color ?? defaultColor.solid.color;
        return color;
    }

    public creaAssi(data: BoxPlotData[]) {
        // Scala degli assi
        this.asseX = d3.scaleBand()
            .domain(data.map(d => d.area))
            .range([0, this.width])
            .padding(0.2);

        this.asseY = d3.scaleLinear()
            .domain([0, 100])
            .nice()
            .range([this.height, 0]);

        // Crea l'elemento SVG
        this.svg
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)


        /*let gtext = this.svg.append("g")
            .attr("transform", `translate(${this.asseX.bandwidth() / 2},10)`)
        gtext.append("text")
            .text("NUMERO DI INSEGNAMENTI VALUTATI: " + this.numberOfIns.length)
            .attr("dy", ".35em")
            .style("font-size", "10")
            .call(this.wrap, this.asseX.bandwidth() * 10)*/

        let g = this.svg
            .append("g")
            .attr("id", "svg-container")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // Aggiungi asse X
        g.append("g")
            .attr("transform", `translate(0,${this.height + this.margin.xAxistop})`)
            .call(d3.axisBottom(this.asseX))
            .selectAll("line").remove();
        g.selectAll("text") // Seleziona tutte le etichette dell'asse X
            .style("text-anchor", "middle") // Centro il testo
            .attr("dy", ".35em")// Allineamento verticale del testo
            .call(this.wrap, this.asseX.bandwidth()); // Applica la funzione wrap per spezzare il testo

        // Aggiungi asse Y
        g.append("g")
            .call(d3.axisLeft(this.asseY))
            .selectAll("line").remove();
        g.selectAll("path").remove();
    }

    public aggiungiThreshold(percentage, attribs) {
        var line = this.root.select("#svg-container")
            .append("line")
            .attr("x1", 0)
            .attr("x2", this.width)
            .attr("y1", this.asseY(percentage))
            .attr("y2", this.asseY(percentage))
        for (var i of Object.keys(attribs)) {
            line.attr(i, attribs[i])
        }
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

    public createThresholdLines(dataView: DataView) {
        this.thresholdLines = [];
        for (var i = 0; i < this.visualSettings.stile.nOfThresholdLines.value; i++) {
            var tl = new ThresholdLines();
            const defaultColor: Fill = {
                solid: {
                    color: "#000000",
                }
            };
            const prop: DataViewObjectPropertyIdentifier = {
                objectName: "lineOptions",
                propertyName: "lineColor"
            };

            let colorFromObjects: Fill;
            if (dataView.categorical.categories[0].objects?.[i]) {
                colorFromObjects = dataViewObjects.getValue(dataView.categorical.categories[0]?.objects[i], prop);
            }
            let color = colorFromObjects?.solid.color ?? defaultColor.solid.color;
            tl.setColor(color);
            this.thresholdLines.push(tl);
        }
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
        this.insertStyle()
        let div = this.root.append("div")
        div.style("height", "100%").style("overflow", "scroll")
        let table = div.append("table")
            .style("border-collapse", "collapse")
            .style("width", "100%")

        // Creazione dell'header della tabella
        let thead = table.append("thead").append("tr");
        var data = []
        let columns = dataView.categorical.categories
        let values = dataView.categorical.values
        for (let i = 0; i < columns[0].values.length; i++) {
            data.push({})
        }
        for (let i = 0; i < columns.length; i++) {
            if (i > 0) thead.append("th").text(columns[i].source.displayName).style("border", "1px solid black").style("background", "#ddd");
            console.log(`GRUPPO ${i} = ${columns[i].source.displayName}`)
            data[0][columns[i].source.displayName] = columns[i].values[0];
        }
        data[0][values[0].source.displayName] = 0;
        for (let i = 0; i < columns[0].values.length; i++) {
            for (let j = 0; j < columns.length; j++) {
                data[i][columns[j].source.displayName] = columns[j].values[i];
            }
            data[i][values[0].source.displayName] = dataView.categorical.values.grouped()[0].values[0].values[i]
        }
        data.sort((a, b) => {
            for (let i = 1; i < columns.length; i++) {
                let result = a[columns[i].source.displayName].localeCompare(b[columns[i].source.displayName]);
                if (result != 0) return result
            }
            let y1 = parseInt(a[columns[0].source.displayName].split("/")[0]);
            let y2 = parseInt(b[columns[0].source.displayName].split("/")[0]);
            return y1 - y2;
            //return a[columns[columns.length - 1].source.displayName].localeCompare(b[columns[columns.length - 1].source.displayName]);
        })
        let newdata = data.reduce((acc, d) => {
            let year = d[columns[0].source.displayName]
            if (acc[year] == undefined) acc[year] = []
            acc[year].push(d)
            return acc
        }, {})
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
        console.log(data)
        console.log(newdata)
        console.log(datafinal)
        var allyears = (columns[0].values.filter((a, index, arr) => arr.indexOf(a) == index) as string[])
        allyears.sort((a, b) => {
            let y1 = parseInt(a.split("/")[0]);
            let y2 = parseInt(b.split("/")[0]);
            if (y1 != y2) return y1 - y2;
        })
        for (let k of allyears) {
            thead.append("th").text(k).style("border", "1px solid black").style("background", "#ddd");
        }
        console.log("VALUES: ", values[0].source.displayName)

        var fntest = function (row, key, htmlElem, deep = 0) {
            //debugger;
            var inserted = false
            for (let k1 of row.keys()) {
                if (deep == 0) {
                    var tr = htmlElem.append("tr")
                    if (!inserted) {
                        try {
                            tr.append("td").text(key).attr("rowspan", row.keys().length + 1).attr("class", "cell")
                        } catch (error) {
                            console.log("Errore: ", error)
                        }
                    }
                    inserted = true
                }
                if (deep + 1 == columns.length - 1) {
                    //debugger;
                    for (let k2 of allyears)
                        htmlElem.append("td").text(row[k2] ?? " ").attr("class", "cell value")
                    return
                }
                tr.append("td").text(k1).attr("class", "cell")
                fntest(row[k1], k1, tr, deep + 1)
            }

            //Valori degli anni
            /*row = row[row.keys()[0]]
            for(let k2 of allyears)
                htmlElem.append("td").text(row[k2]??" ")
            */
        }

        // Creazione del corpo della tabella
        let tbody = table.append("tbody");
        while (true) {
            for (let key of datafinal["keys"]()) {
                fntest(datafinal[key], key, tbody)
                let totalRow = tbody.append("tr")
                totalRow.append("td").attr("colspan", columns.length - 2).text("Totale per " + key).attr("class","cell total")
                let totale = []
                for (let year of allyears) {
                    totale.push(datafinal[key].keys().map(k => datafinal[key][k][year] ?? 0).reduce((a, b) => a + b, 0))
                }
                for (let t of totale) {
                    totalRow.append("td").text(t).attr("class","cell value total")
                }
            }
            break;
        }
        /*for (let i = 0; i < data.length; i++) {
            let tr = tbody.append("tr")
            var names = []
            var previous = {}
            for (let col = 1; col < columns.length; col++) {
                if(previous[col]==undefined){
                    previous[col] = data[i][columns[col].source.displayName]
                    tr.append("td").text(data[i][columns[col].source.displayName]).style("border", "1px solid black").attr("rowspan",datafinal[data[i][columns[col].source.displayName].length])
                }
                if(col==1 && data[i][columns[col].source.displayName] != previous[col]){
                    tr.append("td").text(data[i][columns[col].source.displayName]).style("border", "1px solid black").attr("rowspan",datafinal[data[i][columns[col].source.displayName].length])
                }
                previous[col] = data[i][columns[col].source.displayName]
                names.push(columns[col].source.displayName)
            }
            for (let k = 0; k < allyears.length; k++) {
                let valueOfColumn = newdata[allyears[k]].filter(a => {
                    for (let n of names) {
                        if (a[n] != data[i][n]) return false
                    }
                    return true
                })[0] ?? []
                valueOfColumn = Object.keys(valueOfColumn).length > 0 ? valueOfColumn[values[0].source.displayName] : " "
                tr.append("td").text(valueOfColumn).style("text-align", "center").style("border", "1px solid black")
            }
        }*/

        // Disegna il boxplot per ciascuna area delle domande
        const activeSelections = this.selectionManager.getSelectionIds();

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