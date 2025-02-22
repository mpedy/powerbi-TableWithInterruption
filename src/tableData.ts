export class tableData {
    private columnName: string[]
    constructor(columnName: string[]){
        this.columnName = columnName
    }
    createData(obj){
        let res = {}
        for(let i =0; i<this.columnName.length; i++){
            res[this.columnName[i]] = obj[this.columnName[i]]
        }
        return res
    }
}