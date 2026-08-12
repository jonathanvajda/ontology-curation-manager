# Hard Requirements

## Required Annotations for Ontologies

### Exactly 1...
|Query|Made|Wired|
|:---|:---:|:---:|
| - [x] ontology-has-exactly-1-owl-versioniri |Y|Y|
| - [x] ontology-has-exactly-1-owl-versioniri |Y|Y|
| - [x] ontology-has-exactly-1-owl-versioninfo |Y|Y|
| - [x] ontology-has-exactly-1-dcterms-title |Y|Y|
| - [x] ontology-has-exactly-1-dcterms-description |Y|Y|
| - [x] ontology-has-exactly-1-dcterms-license |Y|Y|

### Conditional
- [x] ontology-has-language-tag-if-rdfs-comment
- [x] ontology-has-language-tag-if-skos-example
- [x] ontology-has-language-tag-if-dcterms-accessRights (corrected from nonexistent `skos:accessRights`)
- [x] ontology-has-language-tag-if-cco-copyright (corrected from nonexistent `skos:copyright`; uses `cco:ont00001744`)


## Required Annotations for Ontology Elements

### Exactly 1...

#### Label
|Query|Made|Wired|
|:---|:---:|:---:|
| - [x] Class-has-exactly-1-rdfs-label-with-english-language-tag |Y|N|
| - [x] ObjectProperty-has-exactly-1-rdfs-label-with-english-language-tag |Y|N|
| - [x] NamedIndividual-has-exactly-1-rdfs-label-with-english-language-tag |Y|N|
| - [x] DatatypeProperty-has-exactly-1-rdfs-label-with-english-language-tag |Y|N|

#### Textual Definition
|Query|Made|Wired|
|:---|:---:|:---:|
Class-has-exactly-1-skos-definition-with-english-language-tag|Y|N|
ObjectProperty-has-exactly-1-skos-definition-with-english-language-tag|Y|N|
NamedIndividual-has-exactly-1-skos-definition-with-english-language-tag|Y|N|
DatatypeProperty-has-exactly-1-skos-definition-with-english-language-tag|Y|N|

#### Home ontology (cco:ont00001760)
- [x] Class-has-exactly-1-cco-is-curated-in-ontology
- [x] ObjectProperty-has-exactly-1-cco-is-curated-in-ontology
- [x] NamedIndividual-has-exactly-1-cco-is-curated-in-ontology
- [x] DatatypeProperty-has-exactly-1-cco-is-curated-in-ontology

### At least 1
- [x] Class-has-dcterms-bibliographicCitation
- [x] ObjectProperty-has-dcterms-bibliographicCitation
- [x] NamedIndividual-has-dcterms-bibliographicCitation
- [x] DatatypeProperty-has-dcterms-bibliographicCitation

- [x] Class-has-skos-scopeNote
- [x] ObjectProperty-has-skos-scopeNote
- [x] NamedIndividual-has-skos-scopeNote
- [x] DatatypeProperty-has-skos-scopeNote

- [x] Class-has-skos-example
- [x] ObjectProperty-has-skos-example
- [x] NamedIndividual-skos-example
- [x] DatatypeProperty-skos-example


## Required Axioms
- [x] Class-that-is-a-universal-has-exactly-1-rdfs-subclassof-owl-class
- [x] Class-that-is-a-nominal-has-rdfs-subclassof-owl-class
- [x] Class-has-rdfs-subclassof-path-to-some-bfo-class

- [x] ObjectProperty-has-rdfs-domain
- [x] DatatypeProperty-has-rdfs-domain
- [x] AnnotationProperty-has-rdfs-domain

- [x] ObjectProperty-has-rdfs-range
- [x] DatatypeProperty-has-rdfs-range


## Forbidden Pattern
- [x] Class-has-rdfs-subclassof-path-to-itself

- [x] ObjectProperty-is-owl-SymmetricProperty-and-owl-AsymmetricProperty
```
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?property WHERE {
  ?property rdf:type owl:ObjectProperty, owl:SymmetricProperty, owl:AsymmetricProperty .
}
```
- [x] ObjectProperty-is-owl-ReflexiveProperty-and-owl-IrreflexiveProperty
```
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?property WHERE {
  ?property rdf:type owl:ObjectProperty, owl:ReflexiveProperty, owl:IrreflexiveProperty .
}
```
- [x] ObjectProperty-is-owl-ReflexiveProperty-and-owl-AsymmetricProperty
```
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?property WHERE {
  ?property rdf:type owl:ObjectProperty, owl:ReflexiveProperty, owl:AsymmetricProperty .
}
```
- [x] ObjectProperty-is-owl-TransitiveProperty-and-owl-FunctionalProperty
```
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?property WHERE {
  ?property rdf:type owl:ObjectProperty, owl:TransitiveProperty, owl:FunctionalProperty .
}
```
- [x] ObjectProperty-is-owl-TransitiveProperty-and-owl-InverseFunctionalProperty
```
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?property WHERE {
  ?property rdf:type owl:ObjectProperty, owl:TransitiveProperty, owl:InverseFunctionalProperty .
}
```
- [x] ObjectProperty-is-owl-TransitiveProperty-and-owl-AsymmetricProperty
```
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?property WHERE {
  ?property rdf:type owl:ObjectProperty, owl:TransitiveProperty, owl:AsymmetricProperty .
}
```
- [x] ObjectProperty-is-owl-TransitiveProperty-and-owl-IrreflexiveProperty
```
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?property WHERE {
  ?property rdf:type owl:ObjectProperty, owl:TransitiveProperty, owl:IrreflexiveProperty .
}
```
- [x] ObjectProperty-is-owl-TransitiveProperty-and-owl-propertyDisjointWith
```
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?property ?disjointWithProperty WHERE {
  ?property rdf:type owl:TransitiveProperty .
  { ?property owl:propertyDisjointWith ?disjointWithProperty . }
  UNION
  { ?disjointWithProperty owl:propertyDisjointWith ?property . }
}
```

- [x] ObjectProperty-is-owl-TransiveProperty-and-restricted-hasself
```
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?property ?restriction WHERE {
  ?property rdf:type owl:TransitiveProperty .
  ?restriction rdf:type owl:Restriction ;
               owl:onProperty ?property ;
               owl:hasSelf ?hasSelfVal .
}
```

- [x] ObjectProperty-is-owl-TransiveProperty-and-restricted-hasself
```
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?property ?restriction WHERE {
  ?property rdf:type owl:TransitiveProperty .
  ?restriction rdf:type owl:Restriction ;
               owl:onProperty ?property ;
               owl:hasSelf ?hasSelfVal .
}
```

- [x] ObjectProperty-is-owl-TransiveProperty-and-has-cardinatlity-restriction
```
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT DISTINCT ?property ?restriction ?cardinalityPredicate WHERE {
  ?property rdf:type owl:TransitiveProperty .
  ?restriction rdf:type owl:Restriction ;
               owl:onProperty ?property ;
               ?cardinalityPredicate ?value .
  
  FILTER(?cardinalityPredicate IN (
    owl:cardinality,
    owl:minCardinality,
    owl:maxCardinality,
    owl:qualifiedCardinality,
    owl:minQualifiedCardinality,
    owl:maxQualifiedCardinality
  ))
}
```

## Duplicate Label Violation
- [x] Class-has-rdfs-label-that-matches-another-resource
- [x] ObjectProperty-has-rdfs-label-that-matches-another-resource
- [x] NamedIndividual-has-rdfs-label-that-matches-another-resource
- [x] DatatypeProperty-has-rdfs-label-that-matches-another-resource

## Duplicate Textual Definition Violation
- [x] Class-has-skos-definition-that-matches-another-resource
- [x] ObjectProperty-has-skos-definition-that-matches-another-resource
- [x] NamedIndividual-has-skos-definition-that-matches-another-resource
- [x] DatatypeProperty-has-skos-definition-that-matches-another-resource

# Conditional requirements


## Annotation is present, but doesn't have a language tag

- [x] Class-has-language-tag-if-skos-altlabel
- [x] ObjectProperty-has-language-tag-if-skos-altlabel
- [x] NamedIndividual-has-language-tag-if-skos-altlabel
- [x] DatatypeProperty-has-language-tag-if-skos-altlabel

- [x] Class-has-language-tag-if-skos-example
- [x] ObjectProperty-has-language-tag-if-skos-example
- [x] NamedIndividual-has-language-tag-if-skos-example
- [x] DatatypeProperty-has-language-tag-if-skos-example

- [x] Class-has-language-tag-if-skos-scopeNote
- [x] ObjectProperty-has-language-tag-if-skos-scopeNote
- [x] NamedIndividual-has-language-tag-if-skos-scopeNote
- [x] DatatypeProperty-has-language-tag-if-skos-scopeNote

- [x] Class-has-language-tag-if-rdfs-comment
- [x] ObjectProperty-has-language-tag-if-rdfs-comment
- [x] NamedIndividual-has-language-tag-if-rdfs-comment
- [x] DatatypeProperty-has-language-tag-if-rdfs-comment

- [x] Class-has-language-tag-if-rdfs-seealso
- [x] ObjectProperty-has-language-tag-if-rdfs-seealso
- [x] NamedIndividual-has-language-tag-if-rdfs-seealso
- [x] DatatypeProperty-has-language-tag-if-rdfs-seealso

- [x] Class-has-language-tag-if-cco-acronym
- [x] ObjectProperty-has-language-tag-if-cco-acronym
- [x] NamedIndividual-has-language-tag-if-cco-acronym
- [x] DatatypeProperty-has-language-tag-if-cco-acronym


- [x] Class-has-language-tag-if-cco-doctrinal-definition
- [x] ObjectProperty-has-language-tag-if-cco-doctrinal-definition
- [x] NamedIndividual-has-language-tag-if-cco-doctrinal-definition
- [x] DatatypeProperty-has-language-tag-if-cco-doctrinal-definition

- [x] Class-has-language-tag-if-cco-definition-source
- [x] ObjectProperty-has-language-tag-if-cco-definition-source
- [x] NamedIndividual-has-language-tag-if-cco-definition-source
- [x] DatatypeProperty-has-language-tag-if-cco-definition-source

- [x] Non-blank-node-has-rdf-type-some-owl-type
- [x] NamedIndividual-has-rdf-type-some-owl-class
- [ ] gdc-instance-gdepends-on-some-independent-continuant
- [ ] sdc-instance-sdepends-on-some-independent-continuant

# Recommendations

# Linting

- [x] iri-in-namespace-but-not-defined-in-rdf
- [x] iri-in-namespace-but-not-defined-in-rdfs
- [x] iri-in-namespace-but-not-defined-in-owl
- [x] iri-in-namespace-but-not-defined-in-dcterms
- [x] iri-in-namespace-but-not-defined-in-dcelements
- [x] iri-in-namespace-but-not-defined-in-skos

# Documentation

In OWL 2, logical incoherence or structural invalidity among `owl:ObjectProperty` axioms arises either from **semantic contradictions** (which force the property extension or domain to be empty) or **OWL 2 DL syntax restrictions** (which forbid "non-simple" properties from taking certain characteristics to maintain decidability in $\mathcal{SROIQ}$).

---

### Direct Semantic Contradictions

These combinations create logical impossibilities. Unless the property is completely empty or the domain contains no individuals, any assertion using these properties causes reasoner unsatisfiability:

* **`owl:SymmetricProperty` + `owl:AsymmetricProperty**`
* *Logical conflict:* Symmetry requires $x R y \implies y R x$, while asymmetry requires $x R y \implies \neg(y R x)$. The only relation satisfying both is the empty set ($\emptyset$).


* **`owl:ReflexiveProperty` + `owl:IrreflexiveProperty**`
* *Logical conflict:* Reflexivity asserts $x R x$ for all $x$ in the domain, while irreflexivity asserts $\neg(x R x)$ for all $x$. A non-empty domain immediately yields a contradiction.


* **`owl:ReflexiveProperty` + `owl:AsymmetricProperty**`
* *Logical conflict:* Reflexivity forces $x R x$. Asymmetry mandates that if $x R y$, then $\neg(y R x)$; substituting $y = x$ yields $x R x \implies \neg(x R x)$.



---

### OWL 2 DL Structural Violations (Simple vs. Non-Simple Properties)

OWL 2 DL distinguishes between **simple** and **non-simple (complex)** properties. Properties declared as `owl:TransitiveProperty` or constructed via `owl:propertyChainAxiom` are non-simple. To avoid undecidability, OWL 2 DL strictly prohibits non-simple properties from being paired with any of the following characteristics:

* **`owl:TransitiveProperty` + `owl:FunctionalProperty**`
* *Why:* Transitivity generates chain inferences ($a R b \land b R c \implies a R c$), while functionality forces $b = c$. Combining them collapses multi-step paths into identity loops or creates grid-like structures that break description logic decidability.


* **`owl:TransitiveProperty` + `owl:InverseFunctionalProperty**`
* *Why:* Similar to functionality; forces incoming paths to collapse, violating simple property constraints.


* **`owl:TransitiveProperty` + `owl:AsymmetricProperty**`
* *Why:* Common in strict partial orders (e.g., `hasAncestor`), but forbidden in OWL 2 DL because verifying asymmetry over unbounded transitive chains is undecidable.


* **`owl:TransitiveProperty` + `owl:IrreflexiveProperty**`
* *Why:* Irreflexivity requires counting/checking specific paths, which is restricted to simple properties.


* **`owl:TransitiveProperty` + `owl:propertyDisjointWith**`
* *Why:* Disjointness assertions are restricted strictly to simple properties.



---

### Cardinality & Self-Restriction Incompatibilities

In addition to global property characteristics, non-simple properties (such as transitive properties or property chains) cannot be combined with local class restrictions:

* **Transitive Property + `owl:hasSelf**` (`ObjectHasSelf`)
* **Transitive Property + Cardinality Restrictions** (`owl:cardinality`, `owl:maxCardinality`, `owl:minCardinality` $>$ 0)

# Turtle Examples
```
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
@prefix ex:   <http://example.org/ontology#> .

<http://example.org/ontology>
    a owl:Ontology .

# =================================================================
# 1. DIRECT SEMANTIC CONTRADICTIONS
# =================================================================

# Symmetric + Asymmetric
# x R y => y R x AND x R y => NOT(y R x). Only valid for empty extensions.
ex:symmetricAndAsymmetric
    a owl:ObjectProperty ,
      owl:SymmetricProperty ,
      owl:AsymmetricProperty .

# Reflexive + Irreflexive
# x R x AND NOT(x R x) for all x in the domain. Unsatisfiable on non-empty domain.
ex:reflexiveAndIrreflexive
    a owl:ObjectProperty ,
      owl:ReflexiveProperty ,
      owl:IrreflexiveProperty .

# Reflexive + Asymmetric
# x R x implies NOT(x R x) when y = x.
ex:reflexiveAndAsymmetric
    a owl:ObjectProperty ,
      owl:ReflexiveProperty ,
      owl:AsymmetricProperty .


# =================================================================
# 2. OWL 2 DL STRUCTURAL VIOLATIONS (Non-Simple Property Incompatibilities)
# =================================================================

# Transitive + Functional
ex:transitiveAndFunctional
    a owl:ObjectProperty ,
      owl:TransitiveProperty ,
      owl:FunctionalProperty .

# Transitive + InverseFunctional
ex:transitiveAndInverseFunctional
    a owl:ObjectProperty ,
      owl:TransitiveProperty ,
      owl:InverseFunctionalProperty .

# Transitive + Asymmetric
ex:transitiveAndAsymmetric
    a owl:ObjectProperty ,
      owl:TransitiveProperty ,
      owl:AsymmetricProperty .

# Transitive + Irreflexive
ex:transitiveAndIrreflexive
    a owl:ObjectProperty ,
      owl:TransitiveProperty ,
      owl:IrreflexiveProperty .

# Transitive + Property Disjointness
# owl:propertyDisjointWith can only target simple properties.
ex:transitivePropA
    a owl:ObjectProperty ,
      owl:TransitiveProperty ;
    owl:propertyDisjointWith ex:simplePropB .

ex:simplePropB
    a owl:ObjectProperty .


# =================================================================
# 3. CARDINALITY & SELF-RESTRICTION VIOLATIONS
# =================================================================

# Non-simple (Transitive) property used in owl:hasSelf
ex:transitiveForSelf
    a owl:ObjectProperty ,
      owl:TransitiveProperty .

ex:ClassViolatingSelf
    a owl:Class ;
    rdfs:subClassOf [
        a owl:Restriction ;
        owl:onProperty ex:transitiveForSelf ;
        owl:hasSelf "true"^^xsd:boolean
    ] .

# Non-simple (Transitive) property used in Cardinality Restrictions
ex:transitiveForCardinality
    a owl:ObjectProperty ,
      owl:TransitiveProperty .

ex:ClassViolatingCardinality
    a owl:Class ;
    rdfs:subClassOf [
        a owl:Restriction ;
        owl:onProperty ex:transitiveForCardinality ;
        owl:maxQualifiedCardinality "1"^^xsd:nonNegativeInteger ;
        owl:onClass owl:Thing
    ] .
```
