onmessage = function (e) {
    const objetos = e.data.objetos

    const resultados = objetos.map(obj => {
        let suma = 0
        for (let i = 0; i < 1000000; i++) {
            suma += Math.sin(i + obj.id)
        }
        return {
            id: obj.id,
            rotationY: obj.rotation + 0.01
        }
    })

    postMessage({ resultados })
}
