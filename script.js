// script.js
class PlotDigitizer {
    constructor() {
        this.canvas = document.getElementById('plotCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.calibrationPoints = {
            xStart: null,
            xEnd: null,
            yStart: null,
            yEnd: null
        };
        this.calibrationStep = 0;
        this.calibration = {
            xMin: 0,
            xMax: 0,
            yMin: 0,
            yMax: 0,
            isSet: false
        };
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('imageInput').addEventListener('change', (e) => {
            this.loadImage(e.target.files[0]);
        });

        this.canvas.addEventListener('click', (e) => {
            if (!this.calibration.isSet) {
                this.handleCalibrationClick(e);
            } else {
                this.addPoint(e);
            }
        });

        document.getElementById('setCalibration').addEventListener('click', () => {
            this.setCalibration();
        });

        document.getElementById('exportExcel').addEventListener('click', () => {
            this.exportToExcel();
        });

        document.getElementById('refreshApp').addEventListener('click', () => {
            this.clearAll();
        });
    }

    loadImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                this.ctx.drawImage(img, 0, 0);
                this.resetCalibration();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    handleCalibrationClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        switch(this.calibrationStep) {
            case 0: // X-axis start
                this.calibrationPoints.xStart = {x, y};
                document.getElementById('xStartInstruction').classList.add('completed');
                break;
            case 1: // X-axis end
                this.calibrationPoints.xEnd = {x, y};
                document.getElementById('xEndInstruction').classList.add('completed');
                break;
            case 2: // Y-axis start
                this.calibrationPoints.yStart = {x, y};
                document.getElementById('yStartInstruction').classList.add('completed');
                break;
            case 3: // Y-axis end
                this.calibrationPoints.yEnd = {x, y};
                document.getElementById('yEndInstruction').classList.add('completed');
                break;
        }

        // Draw calibration point
        this.drawCalibrationPoint(x, y);
        this.calibrationStep++;
    }

    drawCalibrationPoint(x, y) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#3498db';
        this.ctx.fill();
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    setCalibration() {
        const xLogScale = document.getElementById('xLogScale').checked;
        const yLogScale = document.getElementById('yLogScale').checked;

        this.calibration = {
            xMin: parseFloat(document.getElementById('xMin').value),
            xMax: parseFloat(document.getElementById('xMax').value),
            yMin: parseFloat(document.getElementById('yMin').value),
            yMax: parseFloat(document.getElementById('yMax').value),
            xLogScale: xLogScale,
            yLogScale: yLogScale,
            isSet: true
        };
    }

    addPoint(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        // Convert pixel coordinates to plot coordinates
        const plotX = this.pixelToPlotX(x);
        const plotY = this.pixelToPlotY(y);

        this.points.push({ x: plotX, y: plotY });
        this.drawPoint(x, y);
        this.updatePointsTable();
    }

    pixelToPlotX(pixelX) {
        const xRange = this.calibrationPoints.xEnd.x - this.calibrationPoints.xStart.x;
        const normalizedX = (pixelX - this.calibrationPoints.xStart.x) / xRange;
        
        if (this.calibration.xLogScale) {
            const logMin = Math.log10(this.calibration.xMin);
            const logMax = Math.log10(this.calibration.xMax);
            return Math.pow(10, logMin + normalizedX * (logMax - logMin));
        } else {
            return this.calibration.xMin + normalizedX * (this.calibration.xMax - this.calibration.xMin);
        }
    }

    pixelToPlotY(pixelY) {
        const yRange = this.calibrationPoints.yStart.y - this.calibrationPoints.yEnd.y;
        const normalizedY = (this.calibrationPoints.yStart.y - pixelY) / yRange;
        
        if (this.calibration.yLogScale) {
            const logMin = Math.log10(this.calibration.yMin);
            const logMax = Math.log10(this.calibration.yMax);
            return Math.pow(10, logMin + normalizedY * (logMax - logMin));
        } else {
            return this.calibration.yMin + normalizedY * (this.calibration.yMax - this.calibration.yMin);
        }
    }

    drawPoint(x, y) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'red';
        this.ctx.fill();
    }

    updatePointsTable() {
        const tbody = document.getElementById('pointsBody');
        tbody.innerHTML = '';
        
        this.points.forEach((point, index) => {
            const row = tbody.insertRow();
            row.insertCell(0).textContent = index + 1;
            row.insertCell(1).textContent = point.x.toFixed(4);
            row.insertCell(2).textContent = point.y.toFixed(4);
        });
    }

    exportToExcel() {
        const data = this.points.map((point, index) => ({
            'Point': index + 1,
            'X': point.x,
            'Y': point.y
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Plot Data');
        XLSX.writeFile(wb, 'plot_data.xlsx');
    }

    resetCalibration() {
        this.calibrationStep = 0;
        this.calibrationPoints = {
            xStart: null,
            xEnd: null,
            yStart: null,
            yEnd: null
        };
        this.calibration.isSet = false;
        
        // Reset instruction classes
        document.querySelectorAll('.calibration-instructions li').forEach(li => {
            li.classList.remove('completed', 'active');
        });
    }

    clearAll() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Reset points array
        this.points = [];
        
        // Clear the points table
        document.getElementById('pointsBody').innerHTML = '';
        
        // Reset calibration
        this.resetCalibration();
        
        // Reset input fields
        document.getElementById('xMin').value = '';
        document.getElementById('xMax').value = '';
        document.getElementById('yMin').value = '';
        document.getElementById('yMax').value = '';
        
        // Reset checkboxes
        document.getElementById('xLogScale').checked = false;
        document.getElementById('yLogScale').checked = false;
        
        // Reset file input
        document.getElementById('imageInput').value = '';
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new PlotDigitizer();
});
