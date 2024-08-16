class CustomMiddleware {
    constructor(threshold) {
        this.threshold = threshold;
    }

    process(data) {
        if (data > this.threshold) {
            console.log(`CustomMiddleware: Data ${data} exceeds threshold of ${this.threshold}`);
        } else {
            console.log(`CustomMiddleware: Data ${data} is within acceptable range.`);
        }
    }
}

export default CustomMiddleware;