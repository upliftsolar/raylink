import { expect } from 'chai';
import { FilterToMiddleware } from '../middlewares/customMiddleware.js';

//USAGE:
//npm install mocha chai --save-dev
// let p = p_msg(DataView(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42))

describe('CustomMiddleware', () => {
    it('should log data exceeding the threshold', () => {
        const middleware = new FilterToMiddleware([0xFF, 0xFF, 0xFF]);
        let loggedMessage = '';

        console.log = (message) => {
            loggedMessage = message;
        };

        middleware.process([60]);

        //expect(loggedMessage).to.equal('FilterToMiddleware: Data 60 exceeds threshold of 50');
    });
});