import axios from "axios";
import { forceLogout, getStoredAccessToken } from "./authSession";


// let backendUrl = `https://Sam Global.jamsara.com/api/v1/`
let backendUrl = `http://localhost:7004/api/v1`






export function authHeader() {
    const token = getStoredAccessToken();
    if (token) {
        return { 'Authorization': 'Bearer ' + token }; // returning an object
    } else {
        return {}; // returning an empty object if no user or token
    }
}


export function logoutFunction() {
    forceLogout("Logged out");
}

export const headerForPublicAPI = new Headers({
    'Content-Type': 'application/json',
})


export const headerForPrivateAPI = new Headers({
    'Content-Type': 'application/json',
    'Authorization': authHeader().Authorization
})


// export const headerForPrivateAPI = () => {
//     const token = authHeader()['Authorization']; // Accessing Authorization property of the object returned by authHeader()
//     const headers = new Headers();
//     if (token) {
//         headers.append('Authorization', token); // Adding Authorization header if token exists
//     }
//     headers.append('Content-Type', 'application/json'); // Always add Content-Type
//     return headers;
// }


// export const headerForPrivateAPIFormData = new Headers({
//     'Content-Type': 'multipart/form-data',
//     'Authorization': authHeader().Authorization
// })

export const headerForPrivateMediaAPI = new Headers({
    "Content-Type": "multipart/form-data",
    'Authorization': authHeader().Authorization
})



// export const APIcallFunction = async (credentials) => {
//     // console.log("credentialscredentials",credentials)
//     const requestOptions = {
//         method: credentials.method,
//         headers: credentials.header,
//         body: JSON.stringify(credentials.body)
//     };

//     // https://profitplay-backend.vercel.app/
//     // localhost:8804
//     try {
//         const response = await fetch("http://localhost:8804/api/v1" + credentials.endPoint, requestOptions);

//         const responseData = await handleResponse(response);

//         return {
//             data: responseData.data||responseData.message
//         };
//     } catch (error) {
//         console.error('Error:', error);
//         throw error;
//     }
// };
export const APIcallFunction = async (credentials) => {
    const requestOptions = {
        method: credentials.method,
        headers: credentials.header,
        body: JSON.stringify(credentials.body)
    };
    try {
        const response = await fetch(`${backendUrl}${credentials.endPoint}`, requestOptions);

        const responseData = await handleResponse(response);

        return {
            data: responseData.data
        };
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

export const APIcallFunctionForImage = async (credentials) => {
    try {
        const endpointUrl = `${backendUrl}` + credentials.endPoint;
        const headers = {
            'Authorization': authHeader().Authorization,
            'Content-Type': 'multipart/form-data'
        };
        const response = await axios.post(endpointUrl, credentials.body, { headers });

        return {
            data: response.data
        };
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
};

export function handleResponse(response) {

    return response.text().then(text => {
        const data = text && JSON.parse(text);

        // console.log(data);

        if (!response.ok) {
            if (response.status === 401) {
                logoutFunction();
            }
            const error = (data && data.message) || response.statusText;
            return Promise.reject(error);
        }
        if (data.error) {
            if (data.code === 3) {
                logoutFunction();
            }
            const error = (data && data.message) || response.statusText;
            return Promise.reject(error);
        }

        return data;
    });
}

export const role = JSON.parse(window.sessionStorage.getItem('adminuser'))?.roleId || 0;
const configPermissions = JSON.parse(window.sessionStorage.getItem('adminuser'))?.config || {};


export function checkConfigPermissions(key) {
    if (role === 1) {
        if (configPermissions.hasOwnProperty(key)) {
            return configPermissions[key];
        } else {
            return false;
        }
    } else {
        return true;
    }
}


export function generateOptions(step = 10, max = 50) {
    return Array.from({ length: max / step }, (_, i) => {
        const value = (i + 1) * step;
        return { value: value.toString(), label: `Show ${value}` };
    });
};
