# Security

## Reporting a vulnerability

Open a private security advisory on the repository, or email **business@apex-infrastructure.com**.
Please do not open a public issue for an unfixed vulnerability.

## What a receipt proves — and what it does not

The Film Passport is an **audit trail**, never digital truth. A receipt proves that a statement was
made, at a time, about exact bytes. It does not prove the statement is true, that the material is
authentic or original, that anyone authorised the use, that two things were made together, that the
film is good, or that the record is permanent.

Any code or page in this repository that implies more than that is a bug. Please report it.

## Secrets

This repository has never contained a live credential, and it must never contain one. A
`OPERATOR_API_TOKEN` and a `REPLICATE_API_KEY` existed in the history of the *private* development
repository; both were verified stale or placeholder before this repository was created, and the
live values live only in the deployment environment. The public repository was created with a fresh
history precisely so that no history could be published by accident.

If you find a credential in a pull request, treat it as a reportable vulnerability and do not
publish it.
