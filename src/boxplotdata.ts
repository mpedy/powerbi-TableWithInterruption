import ISelectionId = powerbi.visuals.ISelectionId;
import * as d3 from "d3";

export interface BoxPlotData {
    area: string;
    min: number;
    max: number;
    q1: number;
    median: number;
    mean?: number;
    q3: number;
    iqr: number;
    lower_bound: number;
    upper_bound: number;
    values: number[];
    outliers_inf: number[];
    outliers_sup: number[];
    selectionId?: ISelectionId,
    color?: string;
}

export function calculateBoxPlotData(values: number[], area: string, selectionId?: ISelectionId, color?: string): BoxPlotData {
    const min = percentile(values, 0.00);
    const q1 = percentile(values, 0.25);
    const median = percentile(values, 0.50);
    const mean = d3.mean(values);
    const q3 = percentile(values, 0.75);
    const max = percentile(values, 1.00);
    const iqr = q3 - q1;
    // Supponendo che i dati siano in percentuali!
    const lower_bound = Math.max(q1 - 1.5 * iqr, 0)
    const upper_bound = Math.min(q3 + 1.5 * iqr, 100)
    let outliers_inf = [], outliers_sup = [];
    for(var val of values){
        if(val<lower_bound){
            outliers_inf.push(val);
        }else if(val>upper_bound){
            outliers_sup.push(val);
        }
    }

    return {
        area,
        min,
        max,
        q1,
        median,
        mean,
        q3,
        iqr,
        lower_bound,
        upper_bound,
        values,
        outliers_inf,
        outliers_sup,
        selectionId,
        color: color
    };
}
export var percentile = (arr, val) => d3.quantile(arr, val);