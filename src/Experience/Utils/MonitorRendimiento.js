import Stats from 'stats.js'

export default class MonitorRendimiento {
    constructor(gui) {
        this.stats = new Stats()
        this.stats.showPanel(0) // 0: FPS | 1: MS | 2: MB (solo Chrome)
        document.body.appendChild(this.stats.dom)

        this.memoryThreshold = 1200 // MB
        this.warningShown = false

        this.data = {
            fps: 0,
            jsMemoryMB: 0,
            alerta: '✔️ Memoria en rango'
        }

        // 👉 Agregar una carpeta propia dentro de la GUI compartida
        const folder = gui.addFolder('📊 Rendimiento')
        folder.add(this.data, 'fps').name('🎯 FPS').listen()
        folder.add(this.data, 'jsMemoryMB').name('📈 Heap JS (MB)').listen()
        this.alertController = folder.add(this.data, 'alerta').name('⚠️ Estado').listen()

        this.start()
    }

    start() {
        const loop = () => {
            this.stats.begin()

            // FPS (medición simple desde stats.js)
            this.data.fps = Math.floor(1000 / (this.stats.dom.children[0].textContent || 16.67))

            if (performance && performance.memory) {
                const heapUsedMB = performance.memory.usedJSHeapSize / 1048576
                this.data.jsMemoryMB = heapUsedMB.toFixed(2)

                if (heapUsedMB > this.memoryThreshold && !this.warningShown) {
                    this.data.alerta = '🟥 ¡Memoria crítica!'
                    this.warningShown = true
                    console.warn('🚨 Uso excesivo de memoria. Posible swap activado.')
                } else if (heapUsedMB <= this.memoryThreshold && this.warningShown) {
                    this.data.alerta = '✔️ Memoria en rango'
                    this.warningShown = false
                }
            }

            this.stats.end()
            requestAnimationFrame(loop)
        }

        loop()
    }
}
