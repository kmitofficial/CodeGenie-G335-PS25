const axios = require('axios');

class ApiClient {
    constructor(apiUrl) {
        this.apiUrl = apiUrl.replace(/\/+$/, ''); // Remove trailing slash
    }

    async fetchData(endpoint) {
        try {
            const sanitizedEndpoint = endpoint.replace(/^\/+/, ''); // Remove leading slash
            const response = await axios.get(`${this.apiUrl}/${sanitizedEndpoint}`);
            return response.data;
        } catch (error) {
            if (error.response) {
                throw new Error(`Error fetching data: ${error.response.status} - ${error.response.statusText}`);
            } else if (error.message) {
                throw new Error(`Error fetching data: ${error.message}`);
            } else {
                throw new Error('An unknown error occurred while fetching data.');
            }
        }
    }
}

module.exports = ApiClient;