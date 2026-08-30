# Sehat Saathi Prototype Architecture

Patient UI → consent/profile → complaint classifier → data-driven QuestionEngine → patient answers → normalization/provenance → safety engine → patient review → document OCR/extraction → physician dashboard → verification/conflict review → FHIR-ready export.

The LLM, when configured, is a provider used for evidence-grounded summarization only. Clinical routing and safety rules remain deterministic and human-verifiable.
