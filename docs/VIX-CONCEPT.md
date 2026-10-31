# VERIFIED INTENT EXECUTION (VIX)

**Governed autonomous synthesis and formal verification of computational systems from business goals**

- **Source edition date:** 22 October 2026
- **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0)
- **Document status in BiForge:** Long-term conceptual target; not a commitment to implement every component or to implement it on the P85–P91 schedule.

> **Purpose of keeping this document in the repository**
>
> This file preserves the VIX concept as a reference for future BiForge design decisions. The complete target vision is intentionally broader than the near-term BiForge roadmap. Near-term work should adopt only ideas that demonstrably reduce human effort or improve safety and reliability at a justified maintenance cost. The existence of a concept here does not authorize adding a new subsystem, changing current product scope, or claiming formal verification where only tests or static checks are available.

## Status and Purpose

This document describes the Verified Intent Execution (VIX) architectural concept. It consolidates the vision for governed autonomous synthesis with explicit authority boundaries and engineering methods. It addresses the path from natural-language intent to formal models, a minimal operational contract for state and hot reconfiguration, safeguards against silent drift of success criteria, and candidate early demonstration domains.

The human remains the navigator and arbiter of business meaning, risk appetite, and policy boundaries. The system is intended to assume increasing responsibility for exploring implementations, generating and verifying candidates, synthesising executable structures, monitoring behaviour, and safely evolving the running environment within approved constraints. The original concept assumes capabilities that may require a three-to-five-year horizon.

The target architecture is not simplified merely to fit the first prototype. Successive stages are intended to realise the same concept with increasing completeness.

## 1. Concept of VIX

VIX is an autonomous system for the synthesis, formal verification, execution, and controlled evolution of computational systems from high-level business goals. It transforms goals into verifiable behavioural models and executable Dataflow structures, explores alternative algorithms and architectures, enforces mandatory invariants, and can propose alternative interpretations of goals without activating them unless authorised.

VIX manages the lifecycle of a computational realisation: interpretation of business intent, synthesis of candidates, verification, execution, observation of behaviour, and safe modification of the running system. The human is not expected to write implementation code, manually enter mathematical formulae, or understand internal formal proofs.

The human navigates intent, reviews material consequences through the **Intent Review** interface, and decides on policy changes that exceed the pre-authorised envelope.

## 2. Core Principle of Autonomy

VIX has design autonomy: it explores possible realisations, generates hypotheses, selects architectures, synthesises graphs, searches for alternative algorithms, and optimises execution. The human is relieved of routine development and operational labour. The human's essential contribution is to define and periodically refine business goals, accept or reject material consequences presented through Intent Review, and authorise policy-level changes.

Design autonomy is not unrestricted authority to alter business policy. Within mandatory invariants and approved rules, the system may choose implementation strategies. It may surface a new interpretation of a goal with supporting evidence and consequence analysis, but that proposal becomes active only after the prescribed human authorisation.

## 3. Normative Core and Autonomous Design Contour

### 3.1 Normative Core

The **Normative Core** stores the currently agreed business goals and their active interpretation, mandatory business invariants, safety and action constraints, approved change rules, conflict-resolution hierarchy, and conditions requiring human authorisation. It is updated only through a controlled version-approval procedure.

The autonomous contour has no authority to declare a mandatory constraint optional or replace an agreed goal with its own interpretation.

The conflict-resolution hierarchy is:

1. Safety — prevention of unacceptable states.
2. Mandatory business invariant.
3. Law, regulation, and contractual obligation.
4. Approved organisational policy.
5. Business goal.
6. Efficiency and secondary optimisation criteria.

Success criteria and approved KPIs are versioned and immutable within a given version of the Normative Core. Changing them is a Level-5 proposal and requires explicit navigator authorisation. Operational telemetry alone cannot authorise the system to adjust thresholds or reinterpret success criteria.

### 3.2 Autonomous Design and Evolution Contour

This contour generates alternative algorithms and Dataflow graphs, redistributes resources, alters computational topology, evaluates alternative ways of achieving a business goal, analyses execution results, and formulates proposals to change the interpretation of a goal. All activities remain subordinate to the Normative Core.

Operational metrics such as latency, cost, and error rate may be optimised within approved corridors; success criteria may not be silently changed.

## 4. Five Levels of Autonomous Change

The levels below define actions that may be taken without further human authorisation, provided mandatory invariants and safety constraints remain satisfied.

| Level | Authority and condition |
|---|---|
| **1. Resource reallocation** | Autonomously adjust CPU, memory, parallelism, queues, inter-node placement, or cloud budget within explicit policy limits. |
| **2. Dataflow topology change** | Permitted when semantics are preserved within the established model and premises and all mandatory invariants remain satisfied. Full observational equivalence for every possible input is not required. |
| **3. Algorithm change** | Permitted after independent verification, formal or test-based. Automatic admission is allowed only against predefined acceptance criteria. |
| **4. Change of goal-achievement strategy** | Permitted only within an explicit compromise policy. Automatic degradation of an approved KPI beyond stated thresholds is forbidden. |
| **5. Proposal of a new goal interpretation** | Proposal only. Activation requires prescribed human authorisation. The proposal includes an alternative formulation, rationale, counter-examples, scenario comparison, and candidate invariants. |

Before an autonomous adaptation, the system produces an explicit **intent diff**: what changes, which operational metric triggered the change, and whether approved success criteria remain untouched. If a success criterion would be affected, the change is reclassified as a Level-5 proposal.

## 5. Architectural Blocks

### Block 100 — Hybrid Semantic Specifier

Accepts business goals, constraints, and descriptions of expected behaviour. Initial inputs may include natural-language text, structured forms, and examples of inputs and outputs.

It produces a structured **Intent Intermediate Representation (Intent IR)** separating goals, constraints, assumptions, exceptions, temporal bounds, roles, and data objects. Detected ambiguities must not silently become mandatory business rules.

High-risk or irreversible ambiguities are escalated to the human navigator. Low-risk ambiguities may be resolved under approved policy with explicit notification. Questions are batched where possible, and the navigator is interrupted only when material risk or irreversibility warrants it.

### Block 120 — Autonomous Generation of State Models and Invariants

Constructs relevant state spaces, candidate invariants, and formal behavioural models. The human is not required to enter formulae. Generated rules are classified by origin and status:

- consequences of stated requirements;
- technical constraints;
- assumptions about the external environment;
- proposed business rules;
- constraints not yet authorised.

The formalisation pipeline combines:

1. Structured decomposition of intent into typed elements: goals, constraints, assumptions, exceptions, roles, and data objects.
2. Retrieval from a curated catalogue of common business invariant patterns, such as account-balance conservation, operation idempotence, monotonic status progression, and resource non-negativity, followed by specialisation to the current Intent IR.
3. Contrastive refinement: search for simple counter-examples, including via SMT, and present concrete scenarios in Intent Review (for example, “under these inputs the system would do X — is that intended?”).
4. Dual generation: two independent passes produce candidate formalisations; divergences are raised as ambiguities requiring resolution.
5. Mandatory provenance: every predicate links in machine-readable form to the original requirement fragment or the navigator decision that authorised it.

Each formal model receives a high, medium, or low confidence grade based on pattern coverage, manual clarifications required, and counter-example search results. Production launch requires a high-confidence model and navigator authorisation. A human remains responsible for authorising mandatory status for business invariants; technical constraints may be accepted under policy.

### Block 150 — Intent Review: Consequence Exploration and Authorisation

Intent Review is the human-facing interface for exploring scenarios and consequences. It presents understandable examples of behaviour, edge cases, trade-offs, and potential risks without requiring knowledge of formal methods. Counter-examples from formalisation become a primary dialogue mechanism: short, concrete scenarios replace lengthy specification reviews. The interface combines simulation, systematic state-space exploration, and counter-example search.

Mass simulations help reveal problems but do not replace formal proof.

Before authorisation, the navigator sees a concise summary and material risks, with progressive disclosure of normal and edge-case scenarios, differences between candidates, residual uncertainties, and links to formal results. The preferred presentation is a short, decision-oriented summary with the option to inspect details.

### Block 200 — Gradient Formal Verification

Combines classical SAT/SMT solvers with interactive proof assistants according to the property class and required rigour. Critical properties require strict justification within a stated model and its premises. For non-critical properties, weaker guarantees, runtime assertions, and statistical arguments may be appropriate.

Verification outcomes distinguish at least **PROVED**, **REFUTED**, and **UNKNOWN**. Each result records the model, premises, domain of applicability, and supporting artefacts. For critical properties, UNKNOWN blocks production launch or confines execution to an isolated test mode without real-world side effects. If a critical invariant cannot be discharged within a bounded computational budget, the system returns to Intent Review for reformulation rather than proceeding with an unverified core.

For the first prototype, proof of the model together with independent conformance tests of the realisation is treated as sufficient. A fully machine-checked link from model to executable code is a progressive target.

### Block 300 — JIT Dataflow Compiler

Treats the Dataflow graph as the primary representation of computation and SSA form as an internal intermediate representation supporting analysis and optimisation. The architecture distinguishes the semantic graph that captures business meaning, the executable Dataflow graph, and the mapping of that graph onto a target platform. The primary synthesis object for the first version is an executable Dataflow graph together with its state model.

Hand-written code is limited to infrastructure, adapters, and verified primitives; application business logic is synthesised. Traditional languages and operating systems may be used in early infrastructure. Direct ISA mapping is a progressive optimisation to consider after an intermediate compiler path is established.

### Block 400 — Controlled Runtime, Isolation, and Adaptation

Executes verified graphs, collects telemetry, detects deviations, and supports controlled adaptation. A conventional operating system is acceptable provided critical operations place it outside the trusted computing base; full bare-metal execution and direct ISA mapping remain long-term hypotheses rather than first-prototype requirements.

Telemetry is classified into functional anomalies, operational degradation, and suspected security violations. Each class triggers a distinct response from a reaction matrix:

- safety violations: immediate stop or isolation of the affected component;
- business-correctness violations: safe degraded mode or rollback;
- performance deviations: notification and attempted adaptation within approved corridors.

Emergency authority is limited to stop and isolate actions. The system may not autonomously alter goals or mandatory invariants.

Irreversible external side effects, such as payments, order dispatch, or equipment commands, require a special protocol. They are forbidden without an explicit transactional or compensating mechanism and may also require human confirmation under policy.

## 6. Autonomous Evolution Cycle

The system operates a continuous closed loop:

1. **Observe** — collect state, load, latency, errors, and execution outcomes.
2. **Diagnose** — determine probable cause, such as resources, topology, algorithm, or external change.
3. **Hypothesise** — generate alternative realisations or propose a new goal interpretation.
4. **Synthesise** — construct candidate graphs, algorithms, configurations, and placements.
5. **Verify** — check invariants, safety constraints, and other properties, recording premises explicitly.
6. **Evaluate** — compare performance, cost, latency, resilience, and business consequences against immutable success criteria.
7. **Authorise** — determine whether the change may be applied automatically or requires human authorisation; produce an intent diff.
8. **Deploy** — activate the prepared version under controlled conditions.
9. **Monitor and recover** — observe the new version and roll back if acceptance criteria are violated.

Periodic audit reports summarise autonomous changes over an interval and confirm that no approved success criterion was altered. Apparent drift is treated as a policy violation and made visible to the navigator.

## 7. Safe Update of a Running System

Graph or algorithm updates follow a parallel-version model. The current version G1 continues running while the new version G2 is synthesised and verified offline.

State is partitioned into explicit categories:

- **Computational state** — values of graph nodes that can be recomputed.
- **Queues and in-flight events** — must survive reconfiguration or be explicitly drained before switch-over.
- **External side effects** — payments, writes to external systems, and equipment commands; marked irreversible and handled only through compensating actions or two-phase protocols.
- **Checkpoints** — declared points at which state is known to be consistent.

The switch-over protocol is:

1. Synthesise and verify G2 offline.
2. Start G2 in shadow mode, receiving the same inputs as G1 but producing no external effects.
3. Compare outputs against approved invariants and key metrics over a defined observation window.
4. On success, switch atomically at the next consistent checkpoint, or shift traffic gradually if the graph permits.
5. On any violation, roll back immediately and record the event in change history.

Every synthesised graph declares which state categories it considers compatible with hot-swap. Graphs that cannot make this declaration are restricted to a cold restart with explicit loss of in-flight events; the restriction is reported to the navigator. Automatic rollback is triggered by invariant violations, latency or error threshold breaches, G1/G2 divergence, or integrity/security check failure, each with class-specific thresholds.

## 8. Verifiable Change History

Every version maintains a verifiable chain linking original intent, active constraints, executable realisation, and operational results. For each modification, retain:

- business goal and version of its interpretation;
- mandatory invariants, constraints, and assumptions, each with provenance;
- original and new graphs, algorithms, or configurations;
- reason for the change, expected effect, and intent diff;
- formal-verification results and the model used;
- consequence evaluation and the basis for automatic permission or human authorisation;
- execution results after switch-over;
- information required to restore the previous operational version.

## 9. Boundaries of Guarantees

Formal verification applies to a concrete model, a set of premises, and a domain of applicability. It does not automatically prove that the formalisation fully captures a natural-language business goal. VIX therefore distinguishes formally verifiable properties, assumptions about the external environment, and business meanings that could not be completely formalised.

External systems are treated as an untrusted environment: inputs are validated, and environmental assumptions are formalised and monitored. Insufficient formalisability is handled according to criticality. For critical goals, the system refuses to launch a candidate and explains the gap; for non-critical goals, it may offer alternative models under strengthened monitoring.

Simulation, monitoring, hardware isolation, and formal verification address different concerns and do not substitute for one another. The concrete level of assurance is stated for each property and system version.

## 10. Development Stages

The target architecture is not reduced for the first prototype. Stages progressively realise the same concept. Stage I concentrates on proving the value of formalisation and contradiction discovery rather than autonomous evolution; the latter is introduced only after the formalisation path has demonstrated reliability.

### Stage I — Validation of Formalisation and Core Synthesis

Implement the formalisation pipeline (structured decomposition, pattern catalogue, contrastive refinement, dual generation, and provenance), an Intent Review interface driven by counter-examples, formal verification of at least one critical property, and synthesis plus execution of a Dataflow graph with its state model on an existing platform.

Preferred demonstration domains are data-flow / ETL / system integration and transactional business processes, where integrity invariants and status machines are naturally expressible and existing platforms rarely provide formal guarantees or automatic contradiction discovery.

Principal success metrics:

- time from requirement to running prototype;
- fraction of requirements formalised without intervention;
- number of contradictions and counter-examples discovered before execution;
- fraction of critical properties successfully checked;
- navigability of Intent Review.

The first proof points, in order, are: produce a working graph from a textual goal without hand-written business logic; discover contradictions or gaps before launch; and prove at least one critical invariant for a concrete model.

### Stage II — Resilience and Safe Adaptation

Add version management, the full state and switch-over contract, shadow-mode comparison, irreversible-side-effect protocols, telemetry classification, reaction matrices, intent diffs, periodic audit reports, and controlled autonomous evolution within the five-level authority model.

### Stage III — Hardware-Oriented Platform

Progressively strengthen hardware isolation, evaluate direct ISA mapping after the intermediate compiler path matures, and introduce specialised accelerators or bare-metal execution paths where they provide measurable advantage. Continuous telemetry-driven adaptation becomes operational as the platform permits.

## 11. Differentiation in Early Domains

VIX differentiates itself from workflow and integration platforms through three capabilities:

- **Formal contract instead of hope.** The system does not merely construct a pipeline; it produces formal integrity invariants, attempts to prove them, and surfaces contradictions or gaps before execution.
- **Counter-example as the primary language of business dialogue.** Short, concrete scenarios replace lengthy specification reviews, reducing clarification cost and improving requirement quality.
- **Guaranteed evolution with history.** When business rules change, the system shows the formal diff, proves preservation or explicit alteration of critical invariants, performs a controlled switch with rollback capability, and retains traceability from business decision to graph modification.

## 12. Summary of Agreed Decisions

- Project goal: autonomous synthesis and evolution of a computational system from business goals and invariants, with the human acting as navigator rather than developer.
- Conflict hierarchy: safety → mandatory invariant → law/regulation → approved policy → business goal → efficiency.
- The human affirms all business invariants; technical constraints may be accepted under policy. Provenance is recorded for every rule and change.
- Formalisation uses structured decomposition, pattern-catalogue retrieval, contrastive counter-example refinement, dual generation, and mandatory provenance. Models receive a confidence grade; production launch requires high confidence plus navigator authorisation.
- Success criteria are immutable within a version; any change is a Level-5 proposal. Intent diffs and periodic audits prevent silent drift.
- UNKNOWN on a critical property blocks production launch. Emergency authority is limited to stop and isolate.
- State is partitioned into computational state, queues, irreversible side effects, and checkpoints. Hot-swap follows a shadow-comparison protocol; graphs declare compatibility.
- Stage I prioritises formalisation quality and contradiction discovery. Autonomous evolution is introduced in Stage II without reducing the target architecture.
- Early differentiation rests on formal contracts, counter-example dialogue, and evolution with history.
- A conventional OS is acceptable outside the trusted computing base for critical operations; bare-metal and direct ISA mapping remain progressive targets.

## 13. Open Questions for Subsequent Iteration

The following items remain deliberately unresolved and require dedicated architectural discussion or prototype experience:

- precise internal object contracts and schema of VIX artefacts;
- detailed quality metrics and acceptance thresholds for the formalisation pipeline;
- full classification of invariants by criticality and admissible verification methods;
- concrete state-compatibility declarations for representative graph families;
- threat model, trust boundaries, and concrete hardware-isolation architecture;
- detailed admission matrix for non-critical UNKNOWN results;
- quantitative success thresholds and concrete demonstration scenarios for Stage I.

## References

### Formal Methods, Verification, and Theorem Proving

1. Barrett, C., Fontaine, P., & Tinelli, C. (2017). *The SMT-LIB Standard: Version 2.6.* Department of Computer Science, The University of Iowa.
2. de Moura, L., & Bjørner, N. (2008). *Z3: An Efficient SMT Solver.* TACAS.
3. Barbosa, H., et al. (2022). *cvc5: A Versatile and Industrial-Strength SMT Solver.* FMCAD.
4. de Moura, L., Kong, S., Avigad, J., van Doorn, M., & von Raumer, J. (2015). *The Lean Theorem Prover (System Description).* CADE-25.
5. Nipkow, T., Paulson, L. C., & Wenzel, M. (2002). *Isabelle/HOL.* Springer.
6. Bertot, Y., & Castéran, E. (2004). *Coq’Art: The Calculus of Inductive Constructions.* Springer.
7. Clarke, E. M., Grumberg, O., & Peled, D. (1999). *Model Checking.* MIT Press.
8. Baier, C., & Katoen, J.-P. (2008). *Principles of Model Checking.* MIT Press.

### Program Synthesis and Correct-by-Construction Systems

9. Gulwani, S., Polozov, O., & Singh, R. (2017). *Program Synthesis.* Foundations and Trends in Programming Languages, 4(1–2), 1–119.
10. Alur, R., et al. (2013). *Syntax-Guided Synthesis.* FMCAD.
11. Solar-Lezama, A. (2008). *Program Synthesis by Sketching.* PhD thesis, University of California, Berkeley.
12. Manna, Z., & Waldinger, R. (1980). *A Deductive Approach to Program Synthesis.* ACM Transactions on Programming Languages and Systems, 2(1), 90–121.

### Dataflow, SSA, and Intermediate Representations

13. Cytron, R., Ferrante, J., Rosen, B., Wegman, M., & Zadeck, F. (1991). *Efficiently Computing Static Single Assignment Form and the Control Dependence Graph.*
14. Appel, A. (1998). *SSA is Functional Programming.* ACM SIGPLAN Notices.
15. Johnston, W. M., Hanna, J. R., & Millar, J. (2004). *Advances in Dataflow Programming Languages.* ACM Computing Surveys, 36(1), 1–34.
16. Lee, E. A., & Parks, T. M. (1995). *Dataflow Process Networks.* Proceedings of the IEEE, 83(5), 773–801.

### Self-Adaptive, Autonomous, and Runtime Systems

17. Kephart, J. O., & Chess, D. M. (2003). *The Vision of Autonomic Computing.* Computer, 36(1), 41–50.
18. Salehie, M., & Tahvildari, L. (2009). *Self-Adaptive Software: Landscape and Research Challenges.* ACM Transactions on Autonomous and Adaptive Systems, 4(4).
19. Cheng, B. H. C., et al. (2009). *Software Engineering for Self-Adaptive Systems: A Research Roadmap.* Springer.
20. de Lemos, R., et al. (2013). *Software Engineering for Self-Adaptive Systems II: A Second Research Roadmap.* Springer.

### Runtime Verification and Monitoring

21. Leucker, M., & Schallhart, C. (2009). *A Brief Account of Runtime Verification.* Journal of Logic and Algebraic Programming, 78(5), 293–303.
22. Havelund, K., & Roşu, G. (2004). *An Overview of the Java PathExplorer.* Formal Methods in System Design, 24, 27–55.
23. Bartocci, E., et al. (2018). *Specification-Based Monitoring of Cyber-Physical Systems: A Survey.* In *Lectures on Runtime Verification.* Springer.

### Trusted Execution and Hardware Isolation

24. Costan, V., & Devadas, S. (2016). *Intel SGX Explained.* IACR Cryptology ePrint Archive.
25. ARM. (2021). *ARM Confidential Compute Architecture.* Technical white paper.
26. Sabt, M., Achemlal, M., & Bouabdallah, A. (2015). *Trusted Execution Environment: What It Is, and What It Is Not.* IEEE Trustcom/BigDataSE/ISPA.

### Requirements Engineering, Intent, and Human-in-the-Loop

27. van Lamsweerde, A. (2009). *Requirements Engineering: From System Goals to UML Models to Software Specifications.* Wiley.
28. Zave, P., & Jackson, M. (1997). *Four Dark Corners of Requirements Engineering.* ACM Transactions on Software Engineering and Methodology, 6(1), 1–30.
29. Amershi, S., et al. (2019). *Guidelines for Human-AI Interaction.* Proceedings of the 2019 CHI Conference on Human Factors in Computing Systems.
30. Shneiderman, B. (2020). *Human-Centered Artificial Intelligence: Reliable, Safe & Trustworthy.* International Journal of Human–Computer Interaction, 36(6), 495–504.

### Business Process and Workflow Systems

31. van der Aalst, W. M. P. (2013). *Business Process Management: A Comprehensive Survey.* ISRN Software Engineering.
32. Weske, M. (2012). *Business Process Management: Concepts, Languages, Architectures* (2nd ed.). Springer.
33. Russell, N., van der Aalst, W. M. P., & ter Hofstede, A. H. M. (2016). *Workflow Patterns: The Definitive Guide.* MIT Press.

### Related Architectural and Systems Ideas

34. Lamport, L. (2002). *Specifying Systems: The TLA+ Language and Tools for Hardware and Software Engineers.* Addison-Wesley.
35. Abrial, J.-R. (2010). *Modeling in Event-B: System and Software Engineering.* Cambridge University Press.
36. Sutter, H., & Larus, J. (2005). *The Concurrency Revolution.* ACM Queue.

---

**Attribution:** This Markdown edition is adapted from *Verified Intent Execution (VIX)* by Volodymyr Kotegov, source edition dated 22 October 2026, available at <https://ecooorg.github.io/vix.html>, under the Creative Commons Attribution 4.0 International licence. Section wording and formatting have been adapted for Markdown readability; the conceptual content is preserved as a reference document.
