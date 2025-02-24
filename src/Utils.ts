export function maxSubkeys(obj) {
    let result = {};

    for (let key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            // Ottieni il numero massimo di sottochiavi nel sotto-oggetto
            result[key] = getMaxDepthKeys(obj[key]);
        }
    }

    return result;
}
export function getMaxDepthKeys(subObj) {
    let maxKeys = 0;

    function traverse(obj) {
        if (typeof obj === 'object' && obj !== null) {
            let keysCount = Object.keys(obj).length;
            maxKeys = Math.max(maxKeys, keysCount);

            for (let key in obj) {
                traverse(obj[key]); // Continua a esplorare in profondità
            }
        }
    }
    function traverse1(obj) {
        console.log(obj)
        debugger;
        if (typeof obj === 'object' && obj !== null) {
            for (let key in obj) {
                traverse1(obj[key]); // Continua a esplorare in profondità
            }
        }
    }

    traverse1(subObj);
    return maxKeys;
}

export function myMaxDeep(row, deep, maxLength) {
    var numbers = 0;
    function recurse(obj, deep) {
        if (deep == maxLength) {
            numbers += obj.keys().length
            return
        }
        if (typeof obj === 'object' && obj !== null) {
            for (let key of Object.keys(obj)) {
                recurse(obj[key], deep + 1)
            }
        }
    }
    recurse(row, deep+1)
    return numbers;
}

// Esempio di utilizzo
/*var obj = {
    a: { b: { c: 1, d: 1 } },
    a1: { b1: { c1: 1, d1: 1, e1: 4 } },
    a2: { b2: { c2: 7 } }
};
 
console.log(maxSubkeys(obj)); 
// Output atteso: { a: 2, a1: 3, a2: 1 }
*/