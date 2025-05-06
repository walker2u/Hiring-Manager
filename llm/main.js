require('dotenv').config();
const fs = require('fs');
const { seniorSoftwareEngineer, juniorSoftwareEngineer } = require('./criteria.js');

const { GoogleGenAI, createUserContent, createPartFromUri, Type } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

if (!ai) console.log("Missing API Key!!");

async function checkQualificaion(resumeFullName) {
    // console.log((`attachments/${resumeFullName}`).toString("base64"));
    const contents = [
        {
            text: `
                You are an expert AI Hiring Manager assistant specializing in evaluating candidate resumes against specific job criteria.
                Your task is to carefully analyze the provided candidate resume (PDF) and determine if the candidate meets the qualifications outlined in the hiring criteria below for a role :-
                ${juniorSoftwareEngineer}
                **Instructions:**
                1. Thoroughly read and understand **all** points in the Hiring Criteria.
                2. Analyze the **entire** attached resume PDF, looking for specific evidence (experiences, skills listed, project descriptions, roles held, technologies mentioned) that aligns with **each** criterion. Pay attention to keywords related to seniority (e.g., "led", "designed", "architected", "mentored", "optimized", years of experience).
                3. Compare the evidence found in the resume against the requirements outlined in the criteria. Assess if the candidate's experience seems sufficient for a senior level based on the criteria.
                4. Base your final decision **solely** on the provided resume and criteria. Do not make assumptions or use external knowledge about companies or technologies beyond what's stated.
                Respond strictly in the required JSON format based on the provided schema.
            ` },
        {
            inlineData: {
                mimeType: 'application/pdf',
                data: Buffer.from(fs.readFileSync(`attachments/${resumeFullName}`)).toString("base64")
            }
        }
    ];

    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: contents,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        'qualified': {
                            type: Type.BOOLEAN,
                            description: 'Whether the candidate is qualified or not',
                            nullable: false,
                        },
                        'name': {
                            type: Type.STRING,
                            description: 'Name of the candidate',
                            nullable: false,
                        },
                        'currentRole': {
                            type: Type.STRING,
                            description: 'Current role of the candidate eg. Software Architect or Fresher if no current role',
                            nullable: false,
                        },
                        'summary': {
                            type: Type.STRING,
                            description: 'Summary of the candidate on around 30-40 words. eg : Highly skilled Frontend Developer with 8+ years of experience building responsive and performant web applications using React, TypeScript, and Tailwind CSS. Proven ability to lead projects and mentor junior developers.',
                            nullable: false,
                        },
                        'experience': {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: 'Experience of the candidate with role held followed by company name followed by duration of experience. eg : Frontend Engineer @ WebSolutions (2015-2018) or Lead Developer @ TechCorp (2018-Present)',
                                nullable: false,
                            },
                            nullable: false,
                        },
                        'skills': {
                            type: Type.STRING,
                            description: 'Skills of the candidate comma separated. eg : React, TypeScript, Next.js, Tailwind CSS, Zustand, Testing Library, Node.js',
                            nullable: false,
                        }
                    },
                    required: ['qualified', 'name', 'currentRole', 'summary', 'experience', 'skills'],
                },
            },
        },
    });
    const res = JSON.parse(response.text);
    return res[0];
}

// (async () => {
//     try {
//         const val = await checkQualificaion('demo.pdf');
//         console.log(val);
//     } catch (err) {
//         console.error(err);
//     }
// })();

module.exports = checkQualificaion;