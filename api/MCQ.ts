import multer from 'multer';
import fs from 'fs';
import csv from 'csv-parser';
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import bycrpt from 'bcrypt';

const router = Router();
const prisma = new PrismaClient();

const authorize = require('../middleware/auth');


router.post('/create-mcq',authorize, async (req: Request, res: Response) => {
    try {
        console.log(req.body);
        const { question, type, options, answer, test,reason,questionCategory } = req.body;
        if (!question || !type || !options || !answer || !test || !questionCategory) {
            res.status(400).json({ message: 'Question, type, options, answer, and test are required',status:400 });
            return;
        }

        const isBoolean = type.toLowerCase() === 'true/false';
        const _data = {
            question,
            type,
            option1: options[0] || (isBoolean && options.length === 0 ? 'true' : ''),
            option2: options[1] || (isBoolean && options.length === 0 ? 'false' : ''),
            option3: options[2] || null,
            option4: options[3] || null,
            answer1: isBoolean ? answer[0].toLowerCase() : answer[0],
            answer2: answer[1] || null,
            answer3: answer[2] || null,
            answer4: answer[3] || null,
            reason: reason || null,
            questionCategory:questionCategory || null,
        };

        // Create the MCQ entry in the database
        const mcq = await prisma.mCQ.create({
            data: {
                ..._data,
                Test: {
                    connect: {
                        id: test,
                    },
                },
            },
        });
        if (!mcq) {
            res.status(400).json({ message: 'MCQ could not be created',status:400 });
            return;
        }
        res.status(201).json(mcq);
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
});

router.get('/get-mcqs', authorize, async (req: Request, res: Response) => {
    try {
        const mcqs = await prisma.mCQ.findMany({
            include: {
                Test: true,
            },
        });
        res.json(mcqs);
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
});
router.put('/update-mcq/:id', authorize, async (req: Request, res: Response) => {
    try {
        const { question, type, options, answer, test, reason, questionCategory } = req.body;
        console.log(req.body);
        // Validate required fields
        if (!question || !type || !options || !answer || !test) {
            res.status(400).json({ 
                message: 'Question, type, options, answer, and test are required',
                status: 400 
            });
            return;
        }
        
        const isBoolean = type.toLowerCase() === 'true/false';
        const _data = {
            question,
            type,
            option1: options[0] || (isBoolean && options.length === 0 ? 'true' : ''),
            option2: options[1] || (isBoolean && options.length === 0 ? 'false' : ''),
            option3: options[2] || null,
            option4: options[3] || null,
            answer1: isBoolean ? answer[0]?.toLowerCase() : (answer[0] || answer), // Ensure answer1 is not null
            answer2: answer[1] || null,
            answer3: answer[2] || null,
            answer4: answer[3] || null,
            reason: reason || null,
            questionCategory: questionCategory || null,
        };
        
        // Additional validation for answer1
        if (!_data.answer1) {
            res.status(400).json({ 
                message: 'At least one answer (answer1) is required',
                status: 400 
            });
            return;
        }
        
        const mcq = await prisma.mCQ.update({
            where: {
                id: parseInt(req.params.id),
            },
            data: {
                ..._data,
                Test: {
                    connect: {
                        id: test,
                    },
                },
            },
        });
        res.json(mcq);
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: 'Internal server error', status: 500 });
    }
});
router.delete('/delete-mcq/:id', authorize, async (req: Request, res: Response) => {
    try {
        const mcq = await prisma.mCQ.delete({
            where: {
                id: parseInt(req.params.id),
            },
        });
        if (!mcq) {
            res.status(404).json({ message: 'MCQ not found',status:404 });
            return;
        }
        res.json({
            message: 'MCQ deleted successfully',
            status: 200,
        });
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
});

type InputData = {
    Type: string;
    Questions: string;
    Option1: string;
    Option2?: string;
    Option3?: string;
    Option4?: string;
    Answer: string;
    Answer1?: string;
    Answer2?: string;
    Answer3?: string;
    Answer4?: string;
    Reason?: string;
    Category?:string;
  };
  
  type MCQ = {
    question: string;
    type: string;
    option1: string;
    option2?: string;
    option3?: string;
    option4?: string;
    answer1: string;
    answer2?: string;
    answer3?: string;
    answer4?: string;
    reason?: string;
    questionCategory?:string;   
  };
  
  function mapType(type: string): string {
    // Add validation for undefined/null/empty type
    if (!type || typeof type !== 'string') {
        throw new Error(`Invalid or missing question type: ${type}. Expected one of: mcq, multi select, match, boolean, true/false`);
    }
    
    switch (type.toLowerCase().trim()) {
        case 'mcq':
            return 'Single';
        case 'multi select':
            return 'Multiple';
        case 'match':
            return 'Match';
        case 'boolean':
        case 'true/false':
            return 'True/False';
        default:
            throw new Error(`Unknown question type: ${type}. Expected one of: mcq, multi select, match, boolean, true/false`);
    }
}

function transformToMCQ(data: InputData): MCQ {
    // Validate required fields
    if (!data.Questions || typeof data.Questions !== 'string') {
        throw new Error(`Missing or invalid Questions field: ${data.Questions}`);
    }
    
    if (!data.Type || typeof data.Type !== 'string') {
        throw new Error(`Missing or invalid Type field: ${data.Type}. Expected one of: mcq, multi select, match, boolean, true/false`);
    }

    if (!data.Answer && !data.Answer1) {
        throw new Error(`Missing Answer field. Either Answer or Answer1 is required.`);
    }

    const questionType = mapType(data.Type); // Normalize type
    const isBoolean = questionType === 'True/False';

    // Handle answer processing
    let answer1 = '';
    if (isBoolean) {
        answer1 = (data.Answer1 || data.Answer || '').toLowerCase();
    } else {
        answer1 = data.Answer1 || data.Answer || '';
    }

    // Ensure answer1 is not empty
    if (!answer1) {
        throw new Error(`Answer1 cannot be empty. Provide a valid answer.`);
    }

    return {
        question: data.Questions,
        type: questionType,
        option1: isBoolean ? 'true' : data.Option1 || '',
        option2: isBoolean ? 'false' : data.Option2 || '',
        option3: isBoolean ? '' : data.Option3 || '',
        option4: isBoolean ? '' : data.Option4 || '',
        answer1: answer1,
        answer2: data.Answer2 || '',
        answer3: data.Answer3 || '',
        answer4: data.Answer4 || '',
        reason: data.Reason || '',
        questionCategory: data.Category || '',
    };
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = process.env.VERCEL ? '/tmp/uploads' : 'uploads';
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname); 
    },
});
const upload = multer({ storage: storage });
router.post("/upload-mcqs", authorize, upload.single("file"), async (req: any, res: any) => {
    try{
        const { test } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ message: 'File is required', status: 400 });
        }

        const filePath = req.file.path;

        const results: any[] = [];
        const errors: string[] = [];
        let rowIndex = 0;
        
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => {
                rowIndex++;
                try {
                    const transformedData = transformToMCQ(data);
                    results.push(transformedData); 
                } catch (error) {
                    const errorMessage = `Row ${rowIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    console.error("Error transforming data:", errorMessage);
                    console.error("Row data:", data);
                    errors.push(errorMessage);
                }
            })
            .on('end', async () => {
                try {
                    if (results.length === 0) {
                        return res.status(400).json({ 
                            message: 'No valid MCQs could be processed from the file', 
                            status: 400,
                            errors: errors.length > 0 ? errors : ['No valid data found in file']
                        });
                    }

                    const mcqs = await Promise.all(results.map(async (mcq) => {
                        const _mcq = await prisma.mCQ.create({
                            data: {
                                ...mcq,
                                Test: {
                                    connect: {
                                        id: Number(test),
                                    },
                                },
                            },
                        });
                        return _mcq;
                    }));
                    
                    const response: any = {
                        message: `Successfully created ${mcqs.length} MCQ(s)`,
                        status: 200,
                        data: mcqs
                    };
                    
                    if (errors.length > 0) {
                        response.warnings = `${errors.length} row(s) had errors and were skipped`;
                        response.errors = errors;
                    }
                    
                    res.status(200).json(response);
                } catch (dbError) {
                    console.error("Database error:", dbError);
                    res.status(500).json({ 
                        message: 'Error saving MCQs to database', 
                        status: 500,
                        processedRows: results.length,
                        errors: errors
                    });
                }
            })
            .on('error', (error) => {
                console.error("Error reading file:", error);
                res.status(500).json({ message: 'Failed to read file', status: 500 });
            });
        
        return;
    }
    catch(error){
        console.error(error);
        res.status(500).json({ message: 'Internal server error',status:500 });
    }
})


export default router;