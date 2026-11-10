// Smooth Wheel Scrolling
export class SmoothScroll {
    constructor(element) {
        this.element = element;
        this.targetY = element.scrollTop;
        this.currentY = element.scrollTop;
        this.isAnimating = false;
        
        element.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    }
    
    onWheel(e) {
        if (e.shiftKey) return; // Allow horizontal scrolling with shift
        
        // Check if there is actual scrollable content
        if (this.element.scrollHeight <= this.element.clientHeight) return;
        
        e.preventDefault();
        
        // Accumulate target
        this.targetY += e.deltaY * 1.5;
        this.targetY = Math.max(0, Math.min(this.targetY, this.element.scrollHeight - this.element.clientHeight));
        
        if (!this.isAnimating) {
            this.isAnimating = true;
            requestAnimationFrame(this.update.bind(this));
        }
    }
    
    update() {
        const ease = 0.12;
        this.currentY += (this.targetY - this.currentY) * ease;
        
        if (Math.abs(this.targetY - this.currentY) < 0.5) {
            this.currentY = this.targetY;
            this.element.scrollTop = this.currentY;
            this.isAnimating = false;
        } else {
            this.element.scrollTop = this.currentY;
            requestAnimationFrame(this.update.bind(this));
        }
    }
}
