| Test case                                   |                          ELK |       Pellet |       HermiT | Why                                        |
| ------------------------------------------- | ---------------------------: | -----------: | -----------: | ------------------------------------------ |
| Individual in two disjoint classes          |                 Should catch | Should catch | Should catch | OWL 2 EL-compatible                        |
| Domain/range infer disjoint types           |                 Should catch | Should catch | Should catch | OWL 2 EL-compatible                        |
| `owl:allValuesFrom` inconsistency           | Should not catch / out of EL | Should catch | Should catch | Universal restrictions are not in OWL 2 EL |
| Max qualified cardinality + `differentFrom` | Should not catch / out of EL | Should catch | Should catch | Cardinalities are not in OWL 2 EL          |
| Asymmetric property violation               | Should not catch / out of EL | Should catch | Should catch | Asymmetry is not in OWL 2 EL               |
| Irreflexive property violation              | Should not catch / out of EL | Should catch | Should catch | Irreflexivity is not in OWL 2 EL           |
