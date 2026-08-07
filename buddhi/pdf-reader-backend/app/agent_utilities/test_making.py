from io import BytesIO
from google import genai
from google.genai import types
from dotenv import load_dotenv
from pydantic import BaseModel
import ast
import tempfile
import os

load_dotenv(override=True)
client = genai.Client()


class Question(BaseModel):
    question: str
    options: list[str]
    correct_option: str 
class RevisionTest(BaseModel):
    title: str 
    questions: list[str]


def get_instruction(text, instruction) -> str:

    prompt = f"""
                    You are an expert question generator and educator.
        Your task is to create multiple-choice questions (MCQs) from the provided text.

        Instructions:

        Input: You will be given a passage of text.

        Output: Generate MCQs in the following structure:

        {{
        title: "test name",
        questions: [
            {{
            question: "question text",
            options: ["option1", "option2", "option3", "option4"],
            correct_option: 2
            }}
        ]
        }}


        (Note: correct_option is the index (1–4) of the correct answer.)

        Question Types (50/50 split):

        Recall-based (50%) — Direct factual questions checking if the learner remembers key data (names, dates, terms, definitions, numbers, etc.).

        Example: “Who discovered X?”, “When did Y happen?”, “What does Z refer to?”

        Comprehension-based (50%) — Deeper questions testing understanding, inference, reasoning, or interpretation (why/how-type questions).

        Example: “Why did X happen?”, “How does Y influence Z?”, “What can be inferred from this statement?”

        Requirements:

        Questions must cover all key parts of the provided text.

        Avoid ambiguity or opinion-based questions.

        Each question must have exactly four options.

        Ensure all answers are directly supported or inferable from the text.

        Use clear, natural language for both questions and options.


        User instruction to be followed in test question generation: {instruction}
        Here is the text for which to generate questions: {text}
    """

    return prompt




def generate_test_questions(all_text: str, extra_instruction: str) -> dict:

    contents = get_instruction(all_text, extra_instruction)

    try:
        response = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=contents,
            config={
                "response_mime_type": "application/json",
                "response_schema": RevisionTest,
            },
        )

        my_test: RevisionTest = response.parsed
        my_test = ast.literal_eval(my_test.json())
        my_test["questions"] = [ast.literal_eval(q) for q in my_test["questions"]]
        return my_test 
    
    except Exception as e:
        return f"An error occured: {e}"


if __name__ == "__main__":

    all_text = """ 1 Introduction
        Recurrent neural networks, long short-term memory [13] and gated recurrent [7] neural networks
        in particular, have been firmly established as state of the art approaches in sequence modeling and
        transduction problems such as language modeling and machine translation [35, 2, 5]. Numerous
        efforts have since continued to push the boundaries of recurrent language models and encoder-decoder
        architectures [38, 24, 15].
        Recurrent models typically factor computation along the symbol positions of the input and output
        sequences. Aligning the positions to steps in computation time, they generate a sequence of hidden
        states ht, as a function of the previous hidden state ht−1 and the input for position t. This inherently
        sequential nature precludes parallelization within training examples, which becomes critical at longer
        sequence lengths, as memory constraints limit batching across examples. Recent work has achieved
        significant improvements in computational efficiency through factorization tricks [21] and conditional
        computation [32], while also improving model performance in case of the latter. The fundamental
        constraint of sequential computation, however, remains.
        Attention mechanisms have become an integral part of compelling sequence modeling and transduction models in various tasks, allowing modeling of dependencies without regard to their distance in
        the input or output sequences [2, 19]. In all but a few cases [27], however, such attention mechanisms
        are used in conjunction with a recurrent network.
        In this work we propose the Transformer, a model architecture eschewing recurrence and instead
        relying entirely on an attention mechanism to draw global dependencies between input and output.
        The Transformer allows for significantly more parallelization and can reach a new state of the art in
        translation quality after being trained for as little as twelve hours on eight P100 GPUs.
        2 Background
        The goal of reducing sequential computation also forms the foundation of the Extended Neural GPU
        [16], ByteNet [18] and ConvS2S [9], all of which use convolutional neural networks as basic building
        block, computing hidden representations in parallel for all input and output positions. In these models,
        the number of operations required to relate signals from two arbitrary input or output positions grows
        in the distance between positions, linearly for ConvS2S and logarithmically for ByteNet. This makes
        it more difficult to learn dependencies between distant positions [12]. In the Transformer this is
        reduced to a constant number of operations, albeit at the cost of reduced effective resolution due
        to averaging attention-weighted positions, an effect we counteract with Multi-Head Attention as
        described in section 3.2.
        Self-attention, sometimes called intra-attention is an attention mechanism relating different positions
        of a single sequence in order to compute a representation of the sequence. Self-attention has been
        used successfully in a variety of tasks including reading comprehension, abstractive summarization,
        textual entailment and learning task-independent sentence representations [4, 27, 28, 22].
        End-to-end memory networks are based on a recurrent attention mechanism instead of sequencealigned recurrence and have been shown to perform well on simple-language question answering and
        language modeling tasks [34].
        To the best of our knowledge, however, the Transformer is the first transduction model relying
        entirely on self-attention to compute representations of its input and output without using sequencealigned RNNs or convolution. In the following sections, we will describe the Tra """

    extra_instruction = "QUESTIONS SHOULD BE TOUCHING THE BASICS"

    response = generate_test_questions(all_text, extra_instruction)

    print(response)