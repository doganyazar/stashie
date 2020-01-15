import app from '../src/app';
import {equal} from 'assert'

describe("Booya", () => {
    it("should do sth", () => {
        equal(app.value, 0)
    });
});