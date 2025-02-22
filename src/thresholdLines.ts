export class ThresholdLines {
    private color: string;
    private value: number; //percentuale fra 0 e 100

    constructor() {
        this.color = "#000000";
        this.value = 25;
    }

    public getColor() {
        return this.color;
    }
    public getValue() {
        return this.value
    }
    public setColor(color: string) {
        this.color = color;
    }
    public setValue(n: number) {
        if (n >= 0 && n <= 100) {
            this.value = n;
        } else {
            console.error("Errore: settando un valore percentuale per la linea di threshold fuori dal range 0-100% - ", n);
        }
    }
};