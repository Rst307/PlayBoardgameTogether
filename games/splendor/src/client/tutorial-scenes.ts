// Fixed synthetic public projections, stored as changes to reduce duplication.
// Regenerate: pnpm exec tsx scripts/generate-splendor-tutorial.ts
export const practiceScenes: unknown = {
  "base": {
    "seats": [
      "tutorial.you",
      "tutorial.opponent"
    ],
    "viewingSeatId": "tutorial.you",
    "currentSeatId": "tutorial.you",
    "turn": 0,
    "phase": "action",
    "finalRound": false,
    "bank": {
      "white": 4,
      "blue": 4,
      "green": 4,
      "red": 4,
      "black": 4,
      "gold": 5
    },
    "market": [
      [
        {
          "id": "card.black.7",
          "tier": 1,
          "bonus": "black",
          "points": 1,
          "cost": {
            "white": 0,
            "blue": 4,
            "green": 0,
            "red": 0,
            "black": 0
          }
        },
        {
          "id": "card.black.0",
          "tier": 1,
          "bonus": "black",
          "points": 0,
          "cost": {
            "white": 1,
            "blue": 1,
            "green": 1,
            "red": 1,
            "black": 0
          }
        },
        {
          "id": "card.green.1",
          "tier": 1,
          "bonus": "green",
          "points": 0,
          "cost": {
            "white": 1,
            "blue": 1,
            "green": 0,
            "red": 1,
            "black": 2
          }
        },
        {
          "id": "card.red.0",
          "tier": 1,
          "bonus": "red",
          "points": 0,
          "cost": {
            "white": 1,
            "blue": 1,
            "green": 1,
            "red": 0,
            "black": 1
          }
        }
      ],
      [
        {
          "id": "card.white.13",
          "tier": 2,
          "bonus": "white",
          "points": 3,
          "cost": {
            "white": 6,
            "blue": 0,
            "green": 0,
            "red": 0,
            "black": 0
          }
        },
        {
          "id": "card.red.8",
          "tier": 2,
          "bonus": "red",
          "points": 1,
          "cost": {
            "white": 2,
            "blue": 0,
            "green": 0,
            "red": 2,
            "black": 3
          }
        },
        {
          "id": "card.blue.9",
          "tier": 2,
          "bonus": "blue",
          "points": 1,
          "cost": {
            "white": 0,
            "blue": 2,
            "green": 3,
            "red": 0,
            "black": 3
          }
        },
        {
          "id": "card.green.13",
          "tier": 2,
          "bonus": "green",
          "points": 3,
          "cost": {
            "white": 0,
            "blue": 0,
            "green": 6,
            "red": 0,
            "black": 0
          }
        }
      ],
      [
        {
          "id": "card.white.17",
          "tier": 3,
          "bonus": "white",
          "points": 5,
          "cost": {
            "white": 3,
            "blue": 0,
            "green": 0,
            "red": 0,
            "black": 7
          }
        },
        {
          "id": "card.red.14",
          "tier": 3,
          "bonus": "red",
          "points": 3,
          "cost": {
            "white": 3,
            "blue": 5,
            "green": 3,
            "red": 0,
            "black": 3
          }
        },
        {
          "id": "card.blue.15",
          "tier": 3,
          "bonus": "blue",
          "points": 4,
          "cost": {
            "white": 7,
            "blue": 0,
            "green": 0,
            "red": 0,
            "black": 0
          }
        },
        {
          "id": "card.black.16",
          "tier": 3,
          "bonus": "black",
          "points": 4,
          "cost": {
            "white": 0,
            "blue": 0,
            "green": 3,
            "red": 6,
            "black": 3
          }
        }
      ]
    ],
    "deckCounts": [
      36,
      26,
      16
    ],
    "nobles": [
      {
        "id": "noble.4",
        "name": "蔷薇女爵",
        "points": 3,
        "requirement": {
          "white": 0,
          "blue": 0,
          "green": 0,
          "red": 4,
          "black": 4
        }
      },
      {
        "id": "noble.5",
        "name": "丝路领主",
        "points": 3,
        "requirement": {
          "white": 0,
          "blue": 3,
          "green": 3,
          "red": 3,
          "black": 0
        }
      },
      {
        "id": "noble.2",
        "name": "白塔夫人",
        "points": 3,
        "requirement": {
          "white": 4,
          "blue": 4,
          "green": 0,
          "red": 0,
          "black": 0
        }
      }
    ],
    "players": {
      "tutorial.you": {
        "tokens": {
          "white": 0,
          "blue": 0,
          "green": 0,
          "red": 0,
          "black": 0,
          "gold": 0
        },
        "purchased": [],
        "nobles": [],
        "reservedCount": 0,
        "bonuses": {
          "white": 0,
          "blue": 0,
          "green": 0,
          "red": 0,
          "black": 0
        },
        "score": 0
      },
      "tutorial.opponent": {
        "tokens": {
          "white": 0,
          "blue": 0,
          "green": 0,
          "red": 0,
          "black": 0,
          "gold": 0
        },
        "purchased": [],
        "nobles": [],
        "reservedCount": 0,
        "bonuses": {
          "white": 0,
          "blue": 0,
          "green": 0,
          "red": 0,
          "black": 0
        },
        "score": 0
      }
    },
    "myReserved": [],
    "legalActions": [
      {
        "type": "take",
        "colors": [
          "white",
          "blue",
          "green"
        ]
      },
      {
        "type": "take",
        "colors": [
          "white",
          "blue",
          "red"
        ]
      },
      {
        "type": "take",
        "colors": [
          "white",
          "blue",
          "black"
        ]
      },
      {
        "type": "take",
        "colors": [
          "white",
          "green",
          "red"
        ]
      },
      {
        "type": "take",
        "colors": [
          "white",
          "green",
          "black"
        ]
      },
      {
        "type": "take",
        "colors": [
          "white",
          "red",
          "black"
        ]
      },
      {
        "type": "take",
        "colors": [
          "blue",
          "green",
          "red"
        ]
      },
      {
        "type": "take",
        "colors": [
          "blue",
          "green",
          "black"
        ]
      },
      {
        "type": "take",
        "colors": [
          "blue",
          "red",
          "black"
        ]
      },
      {
        "type": "take",
        "colors": [
          "green",
          "red",
          "black"
        ]
      },
      {
        "type": "take",
        "colors": [
          "white",
          "white"
        ]
      },
      {
        "type": "take",
        "colors": [
          "blue",
          "blue"
        ]
      },
      {
        "type": "take",
        "colors": [
          "green",
          "green"
        ]
      },
      {
        "type": "take",
        "colors": [
          "red",
          "red"
        ]
      },
      {
        "type": "take",
        "colors": [
          "black",
          "black"
        ]
      },
      {
        "type": "reserve",
        "cardId": "card.black.7"
      },
      {
        "type": "reserve",
        "cardId": "card.black.0"
      },
      {
        "type": "reserve",
        "cardId": "card.green.1"
      },
      {
        "type": "reserve",
        "cardId": "card.red.0"
      },
      {
        "type": "reserve",
        "cardId": "card.white.13"
      },
      {
        "type": "reserve",
        "cardId": "card.red.8"
      },
      {
        "type": "reserve",
        "cardId": "card.blue.9"
      },
      {
        "type": "reserve",
        "cardId": "card.green.13"
      },
      {
        "type": "reserve",
        "cardId": "card.white.17"
      },
      {
        "type": "reserve",
        "cardId": "card.red.14"
      },
      {
        "type": "reserve",
        "cardId": "card.blue.15"
      },
      {
        "type": "reserve",
        "cardId": "card.black.16"
      },
      {
        "type": "reserve_deck",
        "tier": 1
      },
      {
        "type": "reserve_deck",
        "tier": 2
      },
      {
        "type": "reserve_deck",
        "tier": 3
      }
    ],
    "outcome": {
      "status": "ongoing"
    }
  },
  "scenes": [
    {
      "id": "take-three",
      "initial": {},
      "moves": [
        {
          "action": {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "green"
            ]
          },
          "changes": {
            "currentSeatId": "tutorial.opponent",
            "turn": 1,
            "bank": {
              "white": 3,
              "blue": 3,
              "green": 3,
              "red": 4,
              "black": 4,
              "gold": 5
            },
            "players": {
              "tutorial.you": {
                "tokens": {
                  "white": 1,
                  "blue": 1,
                  "green": 1,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              },
              "tutorial.opponent": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              }
            },
            "legalActions": []
          },
          "events": [
            {
              "type": "turn.played",
              "seatId": "tutorial.you",
              "action": "take",
              "eventId": "take-three.0.0"
            }
          ]
        }
      ]
    },
    {
      "id": "take-two",
      "initial": {},
      "moves": [
        {
          "action": {
            "type": "take",
            "colors": [
              "red",
              "red"
            ]
          },
          "changes": {
            "currentSeatId": "tutorial.opponent",
            "turn": 1,
            "bank": {
              "white": 4,
              "blue": 4,
              "green": 4,
              "red": 2,
              "black": 4,
              "gold": 5
            },
            "players": {
              "tutorial.you": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 2,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              },
              "tutorial.opponent": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              }
            },
            "legalActions": []
          },
          "events": [
            {
              "type": "turn.played",
              "seatId": "tutorial.you",
              "action": "take",
              "eventId": "take-two.0.0"
            }
          ]
        }
      ]
    },
    {
      "id": "buy",
      "initial": {
        "bank": {
          "white": 4,
          "blue": 4,
          "green": 4,
          "red": 2,
          "black": 3,
          "gold": 5
        },
        "market": [
          [
            {
              "id": "card.white.4",
              "tier": 1,
              "bonus": "white",
              "points": 0,
              "cost": {
                "white": 0,
                "blue": 0,
                "green": 0,
                "red": 2,
                "black": 1
              }
            },
            {
              "id": "card.black.0",
              "tier": 1,
              "bonus": "black",
              "points": 0,
              "cost": {
                "white": 1,
                "blue": 1,
                "green": 1,
                "red": 1,
                "black": 0
              }
            },
            {
              "id": "card.green.1",
              "tier": 1,
              "bonus": "green",
              "points": 0,
              "cost": {
                "white": 1,
                "blue": 1,
                "green": 0,
                "red": 1,
                "black": 2
              }
            },
            {
              "id": "card.red.0",
              "tier": 1,
              "bonus": "red",
              "points": 0,
              "cost": {
                "white": 1,
                "blue": 1,
                "green": 1,
                "red": 0,
                "black": 1
              }
            }
          ],
          [
            {
              "id": "card.white.13",
              "tier": 2,
              "bonus": "white",
              "points": 3,
              "cost": {
                "white": 6,
                "blue": 0,
                "green": 0,
                "red": 0,
                "black": 0
              }
            },
            {
              "id": "card.red.8",
              "tier": 2,
              "bonus": "red",
              "points": 1,
              "cost": {
                "white": 2,
                "blue": 0,
                "green": 0,
                "red": 2,
                "black": 3
              }
            },
            {
              "id": "card.blue.9",
              "tier": 2,
              "bonus": "blue",
              "points": 1,
              "cost": {
                "white": 0,
                "blue": 2,
                "green": 3,
                "red": 0,
                "black": 3
              }
            },
            {
              "id": "card.green.13",
              "tier": 2,
              "bonus": "green",
              "points": 3,
              "cost": {
                "white": 0,
                "blue": 0,
                "green": 6,
                "red": 0,
                "black": 0
              }
            }
          ],
          [
            {
              "id": "card.white.17",
              "tier": 3,
              "bonus": "white",
              "points": 5,
              "cost": {
                "white": 3,
                "blue": 0,
                "green": 0,
                "red": 0,
                "black": 7
              }
            },
            {
              "id": "card.red.14",
              "tier": 3,
              "bonus": "red",
              "points": 3,
              "cost": {
                "white": 3,
                "blue": 5,
                "green": 3,
                "red": 0,
                "black": 3
              }
            },
            {
              "id": "card.blue.15",
              "tier": 3,
              "bonus": "blue",
              "points": 4,
              "cost": {
                "white": 7,
                "blue": 0,
                "green": 0,
                "red": 0,
                "black": 0
              }
            },
            {
              "id": "card.black.16",
              "tier": 3,
              "bonus": "black",
              "points": 4,
              "cost": {
                "white": 0,
                "blue": 0,
                "green": 3,
                "red": 6,
                "black": 3
              }
            }
          ]
        ],
        "players": {
          "tutorial.you": {
            "tokens": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 2,
              "black": 1,
              "gold": 0
            },
            "purchased": [],
            "nobles": [],
            "reservedCount": 0,
            "bonuses": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0
            },
            "score": 0
          },
          "tutorial.opponent": {
            "tokens": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 0
            },
            "purchased": [],
            "nobles": [],
            "reservedCount": 0,
            "bonuses": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0
            },
            "score": 0
          }
        },
        "legalActions": [
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "green"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "green",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "green",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "green",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "green",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "green",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "white"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "blue"
            ]
          },
          {
            "type": "take",
            "colors": [
              "green",
              "green"
            ]
          },
          {
            "type": "reserve",
            "cardId": "card.white.4"
          },
          {
            "type": "reserve",
            "cardId": "card.black.0"
          },
          {
            "type": "reserve",
            "cardId": "card.green.1"
          },
          {
            "type": "reserve",
            "cardId": "card.red.0"
          },
          {
            "type": "reserve",
            "cardId": "card.white.13"
          },
          {
            "type": "reserve",
            "cardId": "card.red.8"
          },
          {
            "type": "reserve",
            "cardId": "card.blue.9"
          },
          {
            "type": "reserve",
            "cardId": "card.green.13"
          },
          {
            "type": "reserve",
            "cardId": "card.white.17"
          },
          {
            "type": "reserve",
            "cardId": "card.red.14"
          },
          {
            "type": "reserve",
            "cardId": "card.blue.15"
          },
          {
            "type": "reserve",
            "cardId": "card.black.16"
          },
          {
            "type": "reserve_deck",
            "tier": 1
          },
          {
            "type": "reserve_deck",
            "tier": 2
          },
          {
            "type": "reserve_deck",
            "tier": 3
          },
          {
            "type": "buy",
            "cardId": "card.white.4",
            "payment": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 2,
              "black": 1,
              "gold": 0
            }
          }
        ]
      },
      "moves": [
        {
          "action": {
            "type": "buy",
            "cardId": "card.white.4",
            "payment": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 2,
              "black": 1,
              "gold": 0
            }
          },
          "changes": {
            "currentSeatId": "tutorial.opponent",
            "turn": 1,
            "bank": {
              "white": 4,
              "blue": 4,
              "green": 4,
              "red": 4,
              "black": 4,
              "gold": 5
            },
            "market": [
              [
                {
                  "id": "card.black.7",
                  "tier": 1,
                  "bonus": "black",
                  "points": 1,
                  "cost": {
                    "white": 0,
                    "blue": 4,
                    "green": 0,
                    "red": 0,
                    "black": 0
                  }
                },
                {
                  "id": "card.black.0",
                  "tier": 1,
                  "bonus": "black",
                  "points": 0,
                  "cost": {
                    "white": 1,
                    "blue": 1,
                    "green": 1,
                    "red": 1,
                    "black": 0
                  }
                },
                {
                  "id": "card.green.1",
                  "tier": 1,
                  "bonus": "green",
                  "points": 0,
                  "cost": {
                    "white": 1,
                    "blue": 1,
                    "green": 0,
                    "red": 1,
                    "black": 2
                  }
                },
                {
                  "id": "card.red.0",
                  "tier": 1,
                  "bonus": "red",
                  "points": 0,
                  "cost": {
                    "white": 1,
                    "blue": 1,
                    "green": 1,
                    "red": 0,
                    "black": 1
                  }
                }
              ],
              [
                {
                  "id": "card.white.13",
                  "tier": 2,
                  "bonus": "white",
                  "points": 3,
                  "cost": {
                    "white": 6,
                    "blue": 0,
                    "green": 0,
                    "red": 0,
                    "black": 0
                  }
                },
                {
                  "id": "card.red.8",
                  "tier": 2,
                  "bonus": "red",
                  "points": 1,
                  "cost": {
                    "white": 2,
                    "blue": 0,
                    "green": 0,
                    "red": 2,
                    "black": 3
                  }
                },
                {
                  "id": "card.blue.9",
                  "tier": 2,
                  "bonus": "blue",
                  "points": 1,
                  "cost": {
                    "white": 0,
                    "blue": 2,
                    "green": 3,
                    "red": 0,
                    "black": 3
                  }
                },
                {
                  "id": "card.green.13",
                  "tier": 2,
                  "bonus": "green",
                  "points": 3,
                  "cost": {
                    "white": 0,
                    "blue": 0,
                    "green": 6,
                    "red": 0,
                    "black": 0
                  }
                }
              ],
              [
                {
                  "id": "card.white.17",
                  "tier": 3,
                  "bonus": "white",
                  "points": 5,
                  "cost": {
                    "white": 3,
                    "blue": 0,
                    "green": 0,
                    "red": 0,
                    "black": 7
                  }
                },
                {
                  "id": "card.red.14",
                  "tier": 3,
                  "bonus": "red",
                  "points": 3,
                  "cost": {
                    "white": 3,
                    "blue": 5,
                    "green": 3,
                    "red": 0,
                    "black": 3
                  }
                },
                {
                  "id": "card.blue.15",
                  "tier": 3,
                  "bonus": "blue",
                  "points": 4,
                  "cost": {
                    "white": 7,
                    "blue": 0,
                    "green": 0,
                    "red": 0,
                    "black": 0
                  }
                },
                {
                  "id": "card.black.16",
                  "tier": 3,
                  "bonus": "black",
                  "points": 4,
                  "cost": {
                    "white": 0,
                    "blue": 0,
                    "green": 3,
                    "red": 6,
                    "black": 3
                  }
                }
              ]
            ],
            "deckCounts": [
              35,
              26,
              16
            ],
            "players": {
              "tutorial.you": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [
                  {
                    "id": "card.white.4",
                    "tier": 1,
                    "bonus": "white",
                    "points": 0,
                    "cost": {
                      "white": 0,
                      "blue": 0,
                      "green": 0,
                      "red": 2,
                      "black": 1
                    }
                  }
                ],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 1,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              },
              "tutorial.opponent": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              }
            },
            "legalActions": []
          },
          "events": [
            {
              "type": "turn.played",
              "seatId": "tutorial.you",
              "action": "buy",
              "cardId": "card.white.4",
              "eventId": "buy.0.0"
            }
          ]
        }
      ]
    },
    {
      "id": "discount",
      "initial": {
        "bank": {
          "white": 4,
          "blue": 3,
          "green": 4,
          "red": 4,
          "black": 4,
          "gold": 5
        },
        "market": [
          [
            {
              "id": "card.white.6",
              "tier": 1,
              "bonus": "white",
              "points": 0,
              "cost": {
                "white": 0,
                "blue": 3,
                "green": 0,
                "red": 0,
                "black": 0
              }
            },
            {
              "id": "card.black.0",
              "tier": 1,
              "bonus": "black",
              "points": 0,
              "cost": {
                "white": 1,
                "blue": 1,
                "green": 1,
                "red": 1,
                "black": 0
              }
            },
            {
              "id": "card.green.1",
              "tier": 1,
              "bonus": "green",
              "points": 0,
              "cost": {
                "white": 1,
                "blue": 1,
                "green": 0,
                "red": 1,
                "black": 2
              }
            },
            {
              "id": "card.red.0",
              "tier": 1,
              "bonus": "red",
              "points": 0,
              "cost": {
                "white": 1,
                "blue": 1,
                "green": 1,
                "red": 0,
                "black": 1
              }
            }
          ],
          [
            {
              "id": "card.white.13",
              "tier": 2,
              "bonus": "white",
              "points": 3,
              "cost": {
                "white": 6,
                "blue": 0,
                "green": 0,
                "red": 0,
                "black": 0
              }
            },
            {
              "id": "card.red.8",
              "tier": 2,
              "bonus": "red",
              "points": 1,
              "cost": {
                "white": 2,
                "blue": 0,
                "green": 0,
                "red": 2,
                "black": 3
              }
            },
            {
              "id": "card.blue.9",
              "tier": 2,
              "bonus": "blue",
              "points": 1,
              "cost": {
                "white": 0,
                "blue": 2,
                "green": 3,
                "red": 0,
                "black": 3
              }
            },
            {
              "id": "card.green.13",
              "tier": 2,
              "bonus": "green",
              "points": 3,
              "cost": {
                "white": 0,
                "blue": 0,
                "green": 6,
                "red": 0,
                "black": 0
              }
            }
          ],
          [
            {
              "id": "card.white.17",
              "tier": 3,
              "bonus": "white",
              "points": 5,
              "cost": {
                "white": 3,
                "blue": 0,
                "green": 0,
                "red": 0,
                "black": 7
              }
            },
            {
              "id": "card.red.14",
              "tier": 3,
              "bonus": "red",
              "points": 3,
              "cost": {
                "white": 3,
                "blue": 5,
                "green": 3,
                "red": 0,
                "black": 3
              }
            },
            {
              "id": "card.blue.15",
              "tier": 3,
              "bonus": "blue",
              "points": 4,
              "cost": {
                "white": 7,
                "blue": 0,
                "green": 0,
                "red": 0,
                "black": 0
              }
            },
            {
              "id": "card.black.16",
              "tier": 3,
              "bonus": "black",
              "points": 4,
              "cost": {
                "white": 0,
                "blue": 0,
                "green": 3,
                "red": 6,
                "black": 3
              }
            }
          ]
        ],
        "deckCounts": [
          34,
          26,
          16
        ],
        "players": {
          "tutorial.you": {
            "tokens": {
              "white": 0,
              "blue": 1,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 0
            },
            "purchased": [
              {
                "id": "card.blue.0",
                "tier": 1,
                "bonus": "blue",
                "points": 0,
                "cost": {
                  "white": 1,
                  "blue": 0,
                  "green": 1,
                  "red": 1,
                  "black": 1
                }
              },
              {
                "id": "card.blue.1",
                "tier": 1,
                "bonus": "blue",
                "points": 0,
                "cost": {
                  "white": 1,
                  "blue": 0,
                  "green": 1,
                  "red": 2,
                  "black": 1
                }
              }
            ],
            "nobles": [],
            "reservedCount": 0,
            "bonuses": {
              "white": 0,
              "blue": 2,
              "green": 0,
              "red": 0,
              "black": 0
            },
            "score": 0
          },
          "tutorial.opponent": {
            "tokens": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 0
            },
            "purchased": [],
            "nobles": [],
            "reservedCount": 0,
            "bonuses": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0
            },
            "score": 0
          }
        },
        "legalActions": [
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "green"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "green",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "green",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "green",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "green",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "green",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "white"
            ]
          },
          {
            "type": "take",
            "colors": [
              "green",
              "green"
            ]
          },
          {
            "type": "take",
            "colors": [
              "red",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "black",
              "black"
            ]
          },
          {
            "type": "reserve",
            "cardId": "card.white.6"
          },
          {
            "type": "reserve",
            "cardId": "card.black.0"
          },
          {
            "type": "reserve",
            "cardId": "card.green.1"
          },
          {
            "type": "reserve",
            "cardId": "card.red.0"
          },
          {
            "type": "reserve",
            "cardId": "card.white.13"
          },
          {
            "type": "reserve",
            "cardId": "card.red.8"
          },
          {
            "type": "reserve",
            "cardId": "card.blue.9"
          },
          {
            "type": "reserve",
            "cardId": "card.green.13"
          },
          {
            "type": "reserve",
            "cardId": "card.white.17"
          },
          {
            "type": "reserve",
            "cardId": "card.red.14"
          },
          {
            "type": "reserve",
            "cardId": "card.blue.15"
          },
          {
            "type": "reserve",
            "cardId": "card.black.16"
          },
          {
            "type": "reserve_deck",
            "tier": 1
          },
          {
            "type": "reserve_deck",
            "tier": 2
          },
          {
            "type": "reserve_deck",
            "tier": 3
          },
          {
            "type": "buy",
            "cardId": "card.white.6",
            "payment": {
              "white": 0,
              "blue": 1,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 0
            }
          }
        ]
      },
      "moves": [
        {
          "action": {
            "type": "buy",
            "cardId": "card.white.6",
            "payment": {
              "white": 0,
              "blue": 1,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 0
            }
          },
          "changes": {
            "currentSeatId": "tutorial.opponent",
            "turn": 1,
            "bank": {
              "white": 4,
              "blue": 4,
              "green": 4,
              "red": 4,
              "black": 4,
              "gold": 5
            },
            "market": [
              [
                {
                  "id": "card.black.7",
                  "tier": 1,
                  "bonus": "black",
                  "points": 1,
                  "cost": {
                    "white": 0,
                    "blue": 4,
                    "green": 0,
                    "red": 0,
                    "black": 0
                  }
                },
                {
                  "id": "card.black.0",
                  "tier": 1,
                  "bonus": "black",
                  "points": 0,
                  "cost": {
                    "white": 1,
                    "blue": 1,
                    "green": 1,
                    "red": 1,
                    "black": 0
                  }
                },
                {
                  "id": "card.green.1",
                  "tier": 1,
                  "bonus": "green",
                  "points": 0,
                  "cost": {
                    "white": 1,
                    "blue": 1,
                    "green": 0,
                    "red": 1,
                    "black": 2
                  }
                },
                {
                  "id": "card.red.0",
                  "tier": 1,
                  "bonus": "red",
                  "points": 0,
                  "cost": {
                    "white": 1,
                    "blue": 1,
                    "green": 1,
                    "red": 0,
                    "black": 1
                  }
                }
              ],
              [
                {
                  "id": "card.white.13",
                  "tier": 2,
                  "bonus": "white",
                  "points": 3,
                  "cost": {
                    "white": 6,
                    "blue": 0,
                    "green": 0,
                    "red": 0,
                    "black": 0
                  }
                },
                {
                  "id": "card.red.8",
                  "tier": 2,
                  "bonus": "red",
                  "points": 1,
                  "cost": {
                    "white": 2,
                    "blue": 0,
                    "green": 0,
                    "red": 2,
                    "black": 3
                  }
                },
                {
                  "id": "card.blue.9",
                  "tier": 2,
                  "bonus": "blue",
                  "points": 1,
                  "cost": {
                    "white": 0,
                    "blue": 2,
                    "green": 3,
                    "red": 0,
                    "black": 3
                  }
                },
                {
                  "id": "card.green.13",
                  "tier": 2,
                  "bonus": "green",
                  "points": 3,
                  "cost": {
                    "white": 0,
                    "blue": 0,
                    "green": 6,
                    "red": 0,
                    "black": 0
                  }
                }
              ],
              [
                {
                  "id": "card.white.17",
                  "tier": 3,
                  "bonus": "white",
                  "points": 5,
                  "cost": {
                    "white": 3,
                    "blue": 0,
                    "green": 0,
                    "red": 0,
                    "black": 7
                  }
                },
                {
                  "id": "card.red.14",
                  "tier": 3,
                  "bonus": "red",
                  "points": 3,
                  "cost": {
                    "white": 3,
                    "blue": 5,
                    "green": 3,
                    "red": 0,
                    "black": 3
                  }
                },
                {
                  "id": "card.blue.15",
                  "tier": 3,
                  "bonus": "blue",
                  "points": 4,
                  "cost": {
                    "white": 7,
                    "blue": 0,
                    "green": 0,
                    "red": 0,
                    "black": 0
                  }
                },
                {
                  "id": "card.black.16",
                  "tier": 3,
                  "bonus": "black",
                  "points": 4,
                  "cost": {
                    "white": 0,
                    "blue": 0,
                    "green": 3,
                    "red": 6,
                    "black": 3
                  }
                }
              ]
            ],
            "deckCounts": [
              33,
              26,
              16
            ],
            "players": {
              "tutorial.you": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [
                  {
                    "id": "card.blue.0",
                    "tier": 1,
                    "bonus": "blue",
                    "points": 0,
                    "cost": {
                      "white": 1,
                      "blue": 0,
                      "green": 1,
                      "red": 1,
                      "black": 1
                    }
                  },
                  {
                    "id": "card.blue.1",
                    "tier": 1,
                    "bonus": "blue",
                    "points": 0,
                    "cost": {
                      "white": 1,
                      "blue": 0,
                      "green": 1,
                      "red": 2,
                      "black": 1
                    }
                  },
                  {
                    "id": "card.white.6",
                    "tier": 1,
                    "bonus": "white",
                    "points": 0,
                    "cost": {
                      "white": 0,
                      "blue": 3,
                      "green": 0,
                      "red": 0,
                      "black": 0
                    }
                  }
                ],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 1,
                  "blue": 2,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              },
              "tutorial.opponent": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              }
            },
            "legalActions": []
          },
          "events": [
            {
              "type": "turn.played",
              "seatId": "tutorial.you",
              "action": "buy",
              "cardId": "card.white.6",
              "eventId": "discount.0.0"
            }
          ]
        }
      ]
    },
    {
      "id": "reserve",
      "initial": {
        "market": [
          [
            {
              "id": "card.white.6",
              "tier": 1,
              "bonus": "white",
              "points": 0,
              "cost": {
                "white": 0,
                "blue": 3,
                "green": 0,
                "red": 0,
                "black": 0
              }
            },
            {
              "id": "card.black.0",
              "tier": 1,
              "bonus": "black",
              "points": 0,
              "cost": {
                "white": 1,
                "blue": 1,
                "green": 1,
                "red": 1,
                "black": 0
              }
            },
            {
              "id": "card.green.1",
              "tier": 1,
              "bonus": "green",
              "points": 0,
              "cost": {
                "white": 1,
                "blue": 1,
                "green": 0,
                "red": 1,
                "black": 2
              }
            },
            {
              "id": "card.red.0",
              "tier": 1,
              "bonus": "red",
              "points": 0,
              "cost": {
                "white": 1,
                "blue": 1,
                "green": 1,
                "red": 0,
                "black": 1
              }
            }
          ],
          [
            {
              "id": "card.white.13",
              "tier": 2,
              "bonus": "white",
              "points": 3,
              "cost": {
                "white": 6,
                "blue": 0,
                "green": 0,
                "red": 0,
                "black": 0
              }
            },
            {
              "id": "card.red.8",
              "tier": 2,
              "bonus": "red",
              "points": 1,
              "cost": {
                "white": 2,
                "blue": 0,
                "green": 0,
                "red": 2,
                "black": 3
              }
            },
            {
              "id": "card.blue.9",
              "tier": 2,
              "bonus": "blue",
              "points": 1,
              "cost": {
                "white": 0,
                "blue": 2,
                "green": 3,
                "red": 0,
                "black": 3
              }
            },
            {
              "id": "card.green.13",
              "tier": 2,
              "bonus": "green",
              "points": 3,
              "cost": {
                "white": 0,
                "blue": 0,
                "green": 6,
                "red": 0,
                "black": 0
              }
            }
          ],
          [
            {
              "id": "card.white.17",
              "tier": 3,
              "bonus": "white",
              "points": 5,
              "cost": {
                "white": 3,
                "blue": 0,
                "green": 0,
                "red": 0,
                "black": 7
              }
            },
            {
              "id": "card.red.14",
              "tier": 3,
              "bonus": "red",
              "points": 3,
              "cost": {
                "white": 3,
                "blue": 5,
                "green": 3,
                "red": 0,
                "black": 3
              }
            },
            {
              "id": "card.blue.15",
              "tier": 3,
              "bonus": "blue",
              "points": 4,
              "cost": {
                "white": 7,
                "blue": 0,
                "green": 0,
                "red": 0,
                "black": 0
              }
            },
            {
              "id": "card.black.16",
              "tier": 3,
              "bonus": "black",
              "points": 4,
              "cost": {
                "white": 0,
                "blue": 0,
                "green": 3,
                "red": 6,
                "black": 3
              }
            }
          ]
        ],
        "legalActions": [
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "green"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "green",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "green",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "green",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "green",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "green",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "white"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "blue"
            ]
          },
          {
            "type": "take",
            "colors": [
              "green",
              "green"
            ]
          },
          {
            "type": "take",
            "colors": [
              "red",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "black",
              "black"
            ]
          },
          {
            "type": "reserve",
            "cardId": "card.white.6"
          },
          {
            "type": "reserve",
            "cardId": "card.black.0"
          },
          {
            "type": "reserve",
            "cardId": "card.green.1"
          },
          {
            "type": "reserve",
            "cardId": "card.red.0"
          },
          {
            "type": "reserve",
            "cardId": "card.white.13"
          },
          {
            "type": "reserve",
            "cardId": "card.red.8"
          },
          {
            "type": "reserve",
            "cardId": "card.blue.9"
          },
          {
            "type": "reserve",
            "cardId": "card.green.13"
          },
          {
            "type": "reserve",
            "cardId": "card.white.17"
          },
          {
            "type": "reserve",
            "cardId": "card.red.14"
          },
          {
            "type": "reserve",
            "cardId": "card.blue.15"
          },
          {
            "type": "reserve",
            "cardId": "card.black.16"
          },
          {
            "type": "reserve_deck",
            "tier": 1
          },
          {
            "type": "reserve_deck",
            "tier": 2
          },
          {
            "type": "reserve_deck",
            "tier": 3
          }
        ]
      },
      "moves": [
        {
          "action": {
            "type": "reserve",
            "cardId": "card.white.6"
          },
          "changes": {
            "currentSeatId": "tutorial.opponent",
            "turn": 1,
            "bank": {
              "white": 4,
              "blue": 4,
              "green": 4,
              "red": 4,
              "black": 4,
              "gold": 4
            },
            "market": [
              [
                {
                  "id": "card.black.7",
                  "tier": 1,
                  "bonus": "black",
                  "points": 1,
                  "cost": {
                    "white": 0,
                    "blue": 4,
                    "green": 0,
                    "red": 0,
                    "black": 0
                  }
                },
                {
                  "id": "card.black.0",
                  "tier": 1,
                  "bonus": "black",
                  "points": 0,
                  "cost": {
                    "white": 1,
                    "blue": 1,
                    "green": 1,
                    "red": 1,
                    "black": 0
                  }
                },
                {
                  "id": "card.green.1",
                  "tier": 1,
                  "bonus": "green",
                  "points": 0,
                  "cost": {
                    "white": 1,
                    "blue": 1,
                    "green": 0,
                    "red": 1,
                    "black": 2
                  }
                },
                {
                  "id": "card.red.0",
                  "tier": 1,
                  "bonus": "red",
                  "points": 0,
                  "cost": {
                    "white": 1,
                    "blue": 1,
                    "green": 1,
                    "red": 0,
                    "black": 1
                  }
                }
              ],
              [
                {
                  "id": "card.white.13",
                  "tier": 2,
                  "bonus": "white",
                  "points": 3,
                  "cost": {
                    "white": 6,
                    "blue": 0,
                    "green": 0,
                    "red": 0,
                    "black": 0
                  }
                },
                {
                  "id": "card.red.8",
                  "tier": 2,
                  "bonus": "red",
                  "points": 1,
                  "cost": {
                    "white": 2,
                    "blue": 0,
                    "green": 0,
                    "red": 2,
                    "black": 3
                  }
                },
                {
                  "id": "card.blue.9",
                  "tier": 2,
                  "bonus": "blue",
                  "points": 1,
                  "cost": {
                    "white": 0,
                    "blue": 2,
                    "green": 3,
                    "red": 0,
                    "black": 3
                  }
                },
                {
                  "id": "card.green.13",
                  "tier": 2,
                  "bonus": "green",
                  "points": 3,
                  "cost": {
                    "white": 0,
                    "blue": 0,
                    "green": 6,
                    "red": 0,
                    "black": 0
                  }
                }
              ],
              [
                {
                  "id": "card.white.17",
                  "tier": 3,
                  "bonus": "white",
                  "points": 5,
                  "cost": {
                    "white": 3,
                    "blue": 0,
                    "green": 0,
                    "red": 0,
                    "black": 7
                  }
                },
                {
                  "id": "card.red.14",
                  "tier": 3,
                  "bonus": "red",
                  "points": 3,
                  "cost": {
                    "white": 3,
                    "blue": 5,
                    "green": 3,
                    "red": 0,
                    "black": 3
                  }
                },
                {
                  "id": "card.blue.15",
                  "tier": 3,
                  "bonus": "blue",
                  "points": 4,
                  "cost": {
                    "white": 7,
                    "blue": 0,
                    "green": 0,
                    "red": 0,
                    "black": 0
                  }
                },
                {
                  "id": "card.black.16",
                  "tier": 3,
                  "bonus": "black",
                  "points": 4,
                  "cost": {
                    "white": 0,
                    "blue": 0,
                    "green": 3,
                    "red": 6,
                    "black": 3
                  }
                }
              ]
            ],
            "deckCounts": [
              35,
              26,
              16
            ],
            "players": {
              "tutorial.you": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 1
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 1,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              },
              "tutorial.opponent": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              }
            },
            "myReserved": [
              {
                "id": "card.white.6",
                "tier": 1,
                "bonus": "white",
                "points": 0,
                "cost": {
                  "white": 0,
                  "blue": 3,
                  "green": 0,
                  "red": 0,
                  "black": 0
                }
              }
            ],
            "legalActions": []
          },
          "events": [
            {
              "type": "turn.played",
              "seatId": "tutorial.you",
              "action": "reserve",
              "eventId": "reserve.0.0"
            }
          ]
        }
      ]
    },
    {
      "id": "blind",
      "initial": {},
      "moves": [
        {
          "action": {
            "type": "reserve_deck",
            "tier": 1
          },
          "changes": {
            "currentSeatId": "tutorial.opponent",
            "turn": 1,
            "bank": {
              "white": 4,
              "blue": 4,
              "green": 4,
              "red": 4,
              "black": 4,
              "gold": 4
            },
            "deckCounts": [
              35,
              26,
              16
            ],
            "players": {
              "tutorial.you": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 1
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 1,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              },
              "tutorial.opponent": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              }
            },
            "myReserved": [
              {
                "id": "card.white.6",
                "tier": 1,
                "bonus": "white",
                "points": 0,
                "cost": {
                  "white": 0,
                  "blue": 3,
                  "green": 0,
                  "red": 0,
                  "black": 0
                }
              }
            ],
            "legalActions": []
          },
          "events": [
            {
              "type": "turn.played",
              "seatId": "tutorial.you",
              "action": "reserve_deck",
              "eventId": "blind.0.0"
            }
          ]
        }
      ]
    },
    {
      "id": "gold",
      "initial": {
        "bank": {
          "white": 4,
          "blue": 2,
          "green": 4,
          "red": 4,
          "black": 4,
          "gold": 4
        },
        "deckCounts": [
          35,
          26,
          16
        ],
        "players": {
          "tutorial.you": {
            "tokens": {
              "white": 0,
              "blue": 2,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 1
            },
            "purchased": [],
            "nobles": [],
            "reservedCount": 1,
            "bonuses": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0
            },
            "score": 0
          },
          "tutorial.opponent": {
            "tokens": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 0
            },
            "purchased": [],
            "nobles": [],
            "reservedCount": 0,
            "bonuses": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0
            },
            "score": 0
          }
        },
        "myReserved": [
          {
            "id": "card.white.6",
            "tier": 1,
            "bonus": "white",
            "points": 0,
            "cost": {
              "white": 0,
              "blue": 3,
              "green": 0,
              "red": 0,
              "black": 0
            }
          }
        ],
        "legalActions": [
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "green"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "green",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "green",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "green",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "green",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "green",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "white"
            ]
          },
          {
            "type": "take",
            "colors": [
              "green",
              "green"
            ]
          },
          {
            "type": "take",
            "colors": [
              "red",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "black",
              "black"
            ]
          },
          {
            "type": "reserve",
            "cardId": "card.black.7"
          },
          {
            "type": "reserve",
            "cardId": "card.black.0"
          },
          {
            "type": "reserve",
            "cardId": "card.green.1"
          },
          {
            "type": "reserve",
            "cardId": "card.red.0"
          },
          {
            "type": "reserve",
            "cardId": "card.white.13"
          },
          {
            "type": "reserve",
            "cardId": "card.red.8"
          },
          {
            "type": "reserve",
            "cardId": "card.blue.9"
          },
          {
            "type": "reserve",
            "cardId": "card.green.13"
          },
          {
            "type": "reserve",
            "cardId": "card.white.17"
          },
          {
            "type": "reserve",
            "cardId": "card.red.14"
          },
          {
            "type": "reserve",
            "cardId": "card.blue.15"
          },
          {
            "type": "reserve",
            "cardId": "card.black.16"
          },
          {
            "type": "reserve_deck",
            "tier": 1
          },
          {
            "type": "reserve_deck",
            "tier": 2
          },
          {
            "type": "reserve_deck",
            "tier": 3
          },
          {
            "type": "buy",
            "cardId": "card.white.6",
            "payment": {
              "white": 0,
              "blue": 2,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 1
            }
          }
        ]
      },
      "moves": [
        {
          "action": {
            "type": "buy",
            "cardId": "card.white.6",
            "payment": {
              "white": 0,
              "blue": 2,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 1
            }
          },
          "changes": {
            "currentSeatId": "tutorial.opponent",
            "turn": 1,
            "bank": {
              "white": 4,
              "blue": 4,
              "green": 4,
              "red": 4,
              "black": 4,
              "gold": 5
            },
            "players": {
              "tutorial.you": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [
                  {
                    "id": "card.white.6",
                    "tier": 1,
                    "bonus": "white",
                    "points": 0,
                    "cost": {
                      "white": 0,
                      "blue": 3,
                      "green": 0,
                      "red": 0,
                      "black": 0
                    }
                  }
                ],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 1,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              },
              "tutorial.opponent": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              }
            },
            "myReserved": [],
            "legalActions": []
          },
          "events": [
            {
              "type": "turn.played",
              "seatId": "tutorial.you",
              "action": "buy",
              "cardId": "card.white.6",
              "eventId": "gold.0.0"
            }
          ]
        }
      ]
    },
    {
      "id": "return",
      "initial": {
        "bank": {
          "white": 1,
          "blue": 1,
          "green": 1,
          "red": 4,
          "black": 4,
          "gold": 5
        },
        "players": {
          "tutorial.you": {
            "tokens": {
              "white": 3,
              "blue": 3,
              "green": 3,
              "red": 0,
              "black": 0,
              "gold": 0
            },
            "purchased": [],
            "nobles": [],
            "reservedCount": 0,
            "bonuses": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0
            },
            "score": 0
          },
          "tutorial.opponent": {
            "tokens": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 0
            },
            "purchased": [],
            "nobles": [],
            "reservedCount": 0,
            "bonuses": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0
            },
            "score": 0
          }
        },
        "legalActions": [
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "green"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "green",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "green",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "green",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "green",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "green",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "red",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "black",
              "black"
            ]
          },
          {
            "type": "reserve",
            "cardId": "card.black.7"
          },
          {
            "type": "reserve",
            "cardId": "card.black.0"
          },
          {
            "type": "reserve",
            "cardId": "card.green.1"
          },
          {
            "type": "reserve",
            "cardId": "card.red.0"
          },
          {
            "type": "reserve",
            "cardId": "card.white.13"
          },
          {
            "type": "reserve",
            "cardId": "card.red.8"
          },
          {
            "type": "reserve",
            "cardId": "card.blue.9"
          },
          {
            "type": "reserve",
            "cardId": "card.green.13"
          },
          {
            "type": "reserve",
            "cardId": "card.white.17"
          },
          {
            "type": "reserve",
            "cardId": "card.red.14"
          },
          {
            "type": "reserve",
            "cardId": "card.blue.15"
          },
          {
            "type": "reserve",
            "cardId": "card.black.16"
          },
          {
            "type": "reserve_deck",
            "tier": 1
          },
          {
            "type": "reserve_deck",
            "tier": 2
          },
          {
            "type": "reserve_deck",
            "tier": 3
          }
        ]
      },
      "moves": [
        {
          "action": {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "black"
            ]
          },
          "changes": {
            "phase": "return",
            "bank": {
              "white": 0,
              "blue": 0,
              "green": 1,
              "red": 4,
              "black": 3,
              "gold": 5
            },
            "players": {
              "tutorial.you": {
                "tokens": {
                  "white": 4,
                  "blue": 4,
                  "green": 3,
                  "red": 0,
                  "black": 1,
                  "gold": 0
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              },
              "tutorial.opponent": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              }
            },
            "legalActions": [
              {
                "type": "return",
                "color": "white"
              },
              {
                "type": "return",
                "color": "blue"
              },
              {
                "type": "return",
                "color": "green"
              },
              {
                "type": "return",
                "color": "black"
              }
            ]
          },
          "events": [
            {
              "type": "turn.played",
              "seatId": "tutorial.you",
              "action": "take",
              "eventId": "return.0.0"
            }
          ]
        },
        {
          "action": {
            "type": "return",
            "color": "white"
          },
          "changes": {
            "bank": {
              "white": 1,
              "blue": 0,
              "green": 1,
              "red": 4,
              "black": 3,
              "gold": 5
            },
            "players": {
              "tutorial.you": {
                "tokens": {
                  "white": 3,
                  "blue": 4,
                  "green": 3,
                  "red": 0,
                  "black": 1,
                  "gold": 0
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              },
              "tutorial.opponent": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              }
            }
          },
          "events": [
            {
              "type": "turn.played",
              "seatId": "tutorial.you",
              "action": "take",
              "eventId": "return.0.0"
            },
            {
              "type": "turn.played",
              "seatId": "tutorial.you",
              "action": "return",
              "eventId": "return.1.0"
            }
          ]
        },
        {
          "action": {
            "type": "return",
            "color": "blue"
          },
          "changes": {
            "currentSeatId": "tutorial.opponent",
            "turn": 1,
            "phase": "action",
            "bank": {
              "white": 1,
              "blue": 1,
              "green": 1,
              "red": 4,
              "black": 3,
              "gold": 5
            },
            "players": {
              "tutorial.you": {
                "tokens": {
                  "white": 3,
                  "blue": 3,
                  "green": 3,
                  "red": 0,
                  "black": 1,
                  "gold": 0
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              },
              "tutorial.opponent": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              }
            },
            "legalActions": []
          },
          "events": [
            {
              "type": "turn.played",
              "seatId": "tutorial.you",
              "action": "take",
              "eventId": "return.0.0"
            },
            {
              "type": "turn.played",
              "seatId": "tutorial.you",
              "action": "return",
              "eventId": "return.1.0"
            },
            {
              "type": "turn.played",
              "seatId": "tutorial.you",
              "action": "return",
              "eventId": "return.2.0"
            }
          ]
        }
      ]
    },
    {
      "id": "noble",
      "initial": {
        "market": [
          [
            {
              "id": "card.green.4",
              "tier": 1,
              "bonus": "green",
              "points": 0,
              "cost": {
                "white": 2,
                "blue": 1,
                "green": 0,
                "red": 0,
                "black": 0
              }
            },
            {
              "id": "card.black.0",
              "tier": 1,
              "bonus": "black",
              "points": 0,
              "cost": {
                "white": 1,
                "blue": 1,
                "green": 1,
                "red": 1,
                "black": 0
              }
            },
            {
              "id": "card.white.6",
              "tier": 1,
              "bonus": "white",
              "points": 0,
              "cost": {
                "white": 0,
                "blue": 3,
                "green": 0,
                "red": 0,
                "black": 0
              }
            },
            {
              "id": "card.red.0",
              "tier": 1,
              "bonus": "red",
              "points": 0,
              "cost": {
                "white": 1,
                "blue": 1,
                "green": 1,
                "red": 0,
                "black": 1
              }
            }
          ],
          [
            {
              "id": "card.white.13",
              "tier": 2,
              "bonus": "white",
              "points": 3,
              "cost": {
                "white": 6,
                "blue": 0,
                "green": 0,
                "red": 0,
                "black": 0
              }
            },
            {
              "id": "card.red.8",
              "tier": 2,
              "bonus": "red",
              "points": 1,
              "cost": {
                "white": 2,
                "blue": 0,
                "green": 0,
                "red": 2,
                "black": 3
              }
            },
            {
              "id": "card.blue.9",
              "tier": 2,
              "bonus": "blue",
              "points": 1,
              "cost": {
                "white": 0,
                "blue": 2,
                "green": 3,
                "red": 0,
                "black": 3
              }
            },
            {
              "id": "card.green.13",
              "tier": 2,
              "bonus": "green",
              "points": 3,
              "cost": {
                "white": 0,
                "blue": 0,
                "green": 6,
                "red": 0,
                "black": 0
              }
            }
          ],
          [
            {
              "id": "card.white.17",
              "tier": 3,
              "bonus": "white",
              "points": 5,
              "cost": {
                "white": 3,
                "blue": 0,
                "green": 0,
                "red": 0,
                "black": 7
              }
            },
            {
              "id": "card.red.14",
              "tier": 3,
              "bonus": "red",
              "points": 3,
              "cost": {
                "white": 3,
                "blue": 5,
                "green": 3,
                "red": 0,
                "black": 3
              }
            },
            {
              "id": "card.blue.15",
              "tier": 3,
              "bonus": "blue",
              "points": 4,
              "cost": {
                "white": 7,
                "blue": 0,
                "green": 0,
                "red": 0,
                "black": 0
              }
            },
            {
              "id": "card.black.16",
              "tier": 3,
              "bonus": "black",
              "points": 4,
              "cost": {
                "white": 0,
                "blue": 0,
                "green": 3,
                "red": 6,
                "black": 3
              }
            }
          ]
        ],
        "deckCounts": [
          25,
          26,
          16
        ],
        "nobles": [
          {
            "id": "noble.1",
            "name": "海港公爵",
            "points": 3,
            "requirement": {
              "white": 0,
              "blue": 4,
              "green": 4,
              "red": 0,
              "black": 0
            }
          },
          {
            "id": "noble.2",
            "name": "白塔夫人",
            "points": 3,
            "requirement": {
              "white": 4,
              "blue": 4,
              "green": 0,
              "red": 0,
              "black": 0
            }
          },
          {
            "id": "noble.0",
            "name": "翡翠侯爵",
            "points": 3,
            "requirement": {
              "white": 0,
              "blue": 0,
              "green": 4,
              "red": 4,
              "black": 0
            }
          }
        ],
        "players": {
          "tutorial.you": {
            "tokens": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 0
            },
            "purchased": [
              {
                "id": "card.white.0",
                "tier": 1,
                "bonus": "white",
                "points": 0,
                "cost": {
                  "white": 0,
                  "blue": 1,
                  "green": 1,
                  "red": 1,
                  "black": 1
                }
              },
              {
                "id": "card.white.1",
                "tier": 1,
                "bonus": "white",
                "points": 0,
                "cost": {
                  "white": 0,
                  "blue": 1,
                  "green": 2,
                  "red": 1,
                  "black": 1
                }
              },
              {
                "id": "card.white.2",
                "tier": 1,
                "bonus": "white",
                "points": 0,
                "cost": {
                  "white": 0,
                  "blue": 2,
                  "green": 2,
                  "red": 0,
                  "black": 1
                }
              },
              {
                "id": "card.white.3",
                "tier": 1,
                "bonus": "white",
                "points": 0,
                "cost": {
                  "white": 3,
                  "blue": 1,
                  "green": 0,
                  "red": 0,
                  "black": 1
                }
              },
              {
                "id": "card.blue.0",
                "tier": 1,
                "bonus": "blue",
                "points": 0,
                "cost": {
                  "white": 1,
                  "blue": 0,
                  "green": 1,
                  "red": 1,
                  "black": 1
                }
              },
              {
                "id": "card.blue.1",
                "tier": 1,
                "bonus": "blue",
                "points": 0,
                "cost": {
                  "white": 1,
                  "blue": 0,
                  "green": 1,
                  "red": 2,
                  "black": 1
                }
              },
              {
                "id": "card.blue.2",
                "tier": 1,
                "bonus": "blue",
                "points": 0,
                "cost": {
                  "white": 1,
                  "blue": 0,
                  "green": 2,
                  "red": 2,
                  "black": 0
                }
              },
              {
                "id": "card.blue.3",
                "tier": 1,
                "bonus": "blue",
                "points": 0,
                "cost": {
                  "white": 0,
                  "blue": 1,
                  "green": 3,
                  "red": 1,
                  "black": 0
                }
              },
              {
                "id": "card.green.0",
                "tier": 1,
                "bonus": "green",
                "points": 0,
                "cost": {
                  "white": 1,
                  "blue": 1,
                  "green": 0,
                  "red": 1,
                  "black": 1
                }
              },
              {
                "id": "card.green.1",
                "tier": 1,
                "bonus": "green",
                "points": 0,
                "cost": {
                  "white": 1,
                  "blue": 1,
                  "green": 0,
                  "red": 1,
                  "black": 2
                }
              },
              {
                "id": "card.green.2",
                "tier": 1,
                "bonus": "green",
                "points": 0,
                "cost": {
                  "white": 0,
                  "blue": 1,
                  "green": 0,
                  "red": 2,
                  "black": 2
                }
              }
            ],
            "nobles": [],
            "reservedCount": 0,
            "bonuses": {
              "white": 4,
              "blue": 4,
              "green": 3,
              "red": 0,
              "black": 0
            },
            "score": 0
          },
          "tutorial.opponent": {
            "tokens": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 0
            },
            "purchased": [],
            "nobles": [],
            "reservedCount": 0,
            "bonuses": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0
            },
            "score": 0
          }
        },
        "legalActions": [
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "green"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "green",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "green",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "green",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "green",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "green",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "white"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "blue"
            ]
          },
          {
            "type": "take",
            "colors": [
              "green",
              "green"
            ]
          },
          {
            "type": "take",
            "colors": [
              "red",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "black",
              "black"
            ]
          },
          {
            "type": "reserve",
            "cardId": "card.green.4"
          },
          {
            "type": "reserve",
            "cardId": "card.black.0"
          },
          {
            "type": "reserve",
            "cardId": "card.white.6"
          },
          {
            "type": "reserve",
            "cardId": "card.red.0"
          },
          {
            "type": "reserve",
            "cardId": "card.white.13"
          },
          {
            "type": "reserve",
            "cardId": "card.red.8"
          },
          {
            "type": "reserve",
            "cardId": "card.blue.9"
          },
          {
            "type": "reserve",
            "cardId": "card.green.13"
          },
          {
            "type": "reserve",
            "cardId": "card.white.17"
          },
          {
            "type": "reserve",
            "cardId": "card.red.14"
          },
          {
            "type": "reserve",
            "cardId": "card.blue.15"
          },
          {
            "type": "reserve",
            "cardId": "card.black.16"
          },
          {
            "type": "reserve_deck",
            "tier": 1
          },
          {
            "type": "reserve_deck",
            "tier": 2
          },
          {
            "type": "reserve_deck",
            "tier": 3
          },
          {
            "type": "buy",
            "cardId": "card.green.4",
            "payment": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 0
            }
          },
          {
            "type": "buy",
            "cardId": "card.white.6",
            "payment": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 0
            }
          }
        ]
      },
      "moves": [
        {
          "action": {
            "type": "buy",
            "cardId": "card.green.4",
            "payment": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 0
            }
          },
          "changes": {
            "phase": "noble",
            "market": [
              [
                {
                  "id": "card.black.7",
                  "tier": 1,
                  "bonus": "black",
                  "points": 1,
                  "cost": {
                    "white": 0,
                    "blue": 4,
                    "green": 0,
                    "red": 0,
                    "black": 0
                  }
                },
                {
                  "id": "card.black.0",
                  "tier": 1,
                  "bonus": "black",
                  "points": 0,
                  "cost": {
                    "white": 1,
                    "blue": 1,
                    "green": 1,
                    "red": 1,
                    "black": 0
                  }
                },
                {
                  "id": "card.white.6",
                  "tier": 1,
                  "bonus": "white",
                  "points": 0,
                  "cost": {
                    "white": 0,
                    "blue": 3,
                    "green": 0,
                    "red": 0,
                    "black": 0
                  }
                },
                {
                  "id": "card.red.0",
                  "tier": 1,
                  "bonus": "red",
                  "points": 0,
                  "cost": {
                    "white": 1,
                    "blue": 1,
                    "green": 1,
                    "red": 0,
                    "black": 1
                  }
                }
              ],
              [
                {
                  "id": "card.white.13",
                  "tier": 2,
                  "bonus": "white",
                  "points": 3,
                  "cost": {
                    "white": 6,
                    "blue": 0,
                    "green": 0,
                    "red": 0,
                    "black": 0
                  }
                },
                {
                  "id": "card.red.8",
                  "tier": 2,
                  "bonus": "red",
                  "points": 1,
                  "cost": {
                    "white": 2,
                    "blue": 0,
                    "green": 0,
                    "red": 2,
                    "black": 3
                  }
                },
                {
                  "id": "card.blue.9",
                  "tier": 2,
                  "bonus": "blue",
                  "points": 1,
                  "cost": {
                    "white": 0,
                    "blue": 2,
                    "green": 3,
                    "red": 0,
                    "black": 3
                  }
                },
                {
                  "id": "card.green.13",
                  "tier": 2,
                  "bonus": "green",
                  "points": 3,
                  "cost": {
                    "white": 0,
                    "blue": 0,
                    "green": 6,
                    "red": 0,
                    "black": 0
                  }
                }
              ],
              [
                {
                  "id": "card.white.17",
                  "tier": 3,
                  "bonus": "white",
                  "points": 5,
                  "cost": {
                    "white": 3,
                    "blue": 0,
                    "green": 0,
                    "red": 0,
                    "black": 7
                  }
                },
                {
                  "id": "card.red.14",
                  "tier": 3,
                  "bonus": "red",
                  "points": 3,
                  "cost": {
                    "white": 3,
                    "blue": 5,
                    "green": 3,
                    "red": 0,
                    "black": 3
                  }
                },
                {
                  "id": "card.blue.15",
                  "tier": 3,
                  "bonus": "blue",
                  "points": 4,
                  "cost": {
                    "white": 7,
                    "blue": 0,
                    "green": 0,
                    "red": 0,
                    "black": 0
                  }
                },
                {
                  "id": "card.black.16",
                  "tier": 3,
                  "bonus": "black",
                  "points": 4,
                  "cost": {
                    "white": 0,
                    "blue": 0,
                    "green": 3,
                    "red": 6,
                    "black": 3
                  }
                }
              ]
            ],
            "deckCounts": [
              24,
              26,
              16
            ],
            "players": {
              "tutorial.you": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [
                  {
                    "id": "card.white.0",
                    "tier": 1,
                    "bonus": "white",
                    "points": 0,
                    "cost": {
                      "white": 0,
                      "blue": 1,
                      "green": 1,
                      "red": 1,
                      "black": 1
                    }
                  },
                  {
                    "id": "card.white.1",
                    "tier": 1,
                    "bonus": "white",
                    "points": 0,
                    "cost": {
                      "white": 0,
                      "blue": 1,
                      "green": 2,
                      "red": 1,
                      "black": 1
                    }
                  },
                  {
                    "id": "card.white.2",
                    "tier": 1,
                    "bonus": "white",
                    "points": 0,
                    "cost": {
                      "white": 0,
                      "blue": 2,
                      "green": 2,
                      "red": 0,
                      "black": 1
                    }
                  },
                  {
                    "id": "card.white.3",
                    "tier": 1,
                    "bonus": "white",
                    "points": 0,
                    "cost": {
                      "white": 3,
                      "blue": 1,
                      "green": 0,
                      "red": 0,
                      "black": 1
                    }
                  },
                  {
                    "id": "card.blue.0",
                    "tier": 1,
                    "bonus": "blue",
                    "points": 0,
                    "cost": {
                      "white": 1,
                      "blue": 0,
                      "green": 1,
                      "red": 1,
                      "black": 1
                    }
                  },
                  {
                    "id": "card.blue.1",
                    "tier": 1,
                    "bonus": "blue",
                    "points": 0,
                    "cost": {
                      "white": 1,
                      "blue": 0,
                      "green": 1,
                      "red": 2,
                      "black": 1
                    }
                  },
                  {
                    "id": "card.blue.2",
                    "tier": 1,
                    "bonus": "blue",
                    "points": 0,
                    "cost": {
                      "white": 1,
                      "blue": 0,
                      "green": 2,
                      "red": 2,
                      "black": 0
                    }
                  },
                  {
                    "id": "card.blue.3",
                    "tier": 1,
                    "bonus": "blue",
                    "points": 0,
                    "cost": {
                      "white": 0,
                      "blue": 1,
                      "green": 3,
                      "red": 1,
                      "black": 0
                    }
                  },
                  {
                    "id": "card.green.0",
                    "tier": 1,
                    "bonus": "green",
                    "points": 0,
                    "cost": {
                      "white": 1,
                      "blue": 1,
                      "green": 0,
                      "red": 1,
                      "black": 1
                    }
                  },
                  {
                    "id": "card.green.1",
                    "tier": 1,
                    "bonus": "green",
                    "points": 0,
                    "cost": {
                      "white": 1,
                      "blue": 1,
                      "green": 0,
                      "red": 1,
                      "black": 2
                    }
                  },
                  {
                    "id": "card.green.2",
                    "tier": 1,
                    "bonus": "green",
                    "points": 0,
                    "cost": {
                      "white": 0,
                      "blue": 1,
                      "green": 0,
                      "red": 2,
                      "black": 2
                    }
                  },
                  {
                    "id": "card.green.4",
                    "tier": 1,
                    "bonus": "green",
                    "points": 0,
                    "cost": {
                      "white": 2,
                      "blue": 1,
                      "green": 0,
                      "red": 0,
                      "black": 0
                    }
                  }
                ],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 4,
                  "blue": 4,
                  "green": 4,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              },
              "tutorial.opponent": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              }
            },
            "legalActions": [
              {
                "type": "noble",
                "nobleId": "noble.1"
              },
              {
                "type": "noble",
                "nobleId": "noble.2"
              }
            ]
          },
          "events": [
            {
              "type": "turn.played",
              "seatId": "tutorial.you",
              "action": "buy",
              "cardId": "card.green.4",
              "eventId": "noble.0.0"
            }
          ]
        },
        {
          "action": {
            "type": "noble",
            "nobleId": "noble.2"
          },
          "changes": {
            "currentSeatId": "tutorial.opponent",
            "turn": 1,
            "phase": "action",
            "nobles": [
              {
                "id": "noble.1",
                "name": "海港公爵",
                "points": 3,
                "requirement": {
                  "white": 0,
                  "blue": 4,
                  "green": 4,
                  "red": 0,
                  "black": 0
                }
              },
              {
                "id": "noble.0",
                "name": "翡翠侯爵",
                "points": 3,
                "requirement": {
                  "white": 0,
                  "blue": 0,
                  "green": 4,
                  "red": 4,
                  "black": 0
                }
              }
            ],
            "players": {
              "tutorial.you": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [
                  {
                    "id": "card.white.0",
                    "tier": 1,
                    "bonus": "white",
                    "points": 0,
                    "cost": {
                      "white": 0,
                      "blue": 1,
                      "green": 1,
                      "red": 1,
                      "black": 1
                    }
                  },
                  {
                    "id": "card.white.1",
                    "tier": 1,
                    "bonus": "white",
                    "points": 0,
                    "cost": {
                      "white": 0,
                      "blue": 1,
                      "green": 2,
                      "red": 1,
                      "black": 1
                    }
                  },
                  {
                    "id": "card.white.2",
                    "tier": 1,
                    "bonus": "white",
                    "points": 0,
                    "cost": {
                      "white": 0,
                      "blue": 2,
                      "green": 2,
                      "red": 0,
                      "black": 1
                    }
                  },
                  {
                    "id": "card.white.3",
                    "tier": 1,
                    "bonus": "white",
                    "points": 0,
                    "cost": {
                      "white": 3,
                      "blue": 1,
                      "green": 0,
                      "red": 0,
                      "black": 1
                    }
                  },
                  {
                    "id": "card.blue.0",
                    "tier": 1,
                    "bonus": "blue",
                    "points": 0,
                    "cost": {
                      "white": 1,
                      "blue": 0,
                      "green": 1,
                      "red": 1,
                      "black": 1
                    }
                  },
                  {
                    "id": "card.blue.1",
                    "tier": 1,
                    "bonus": "blue",
                    "points": 0,
                    "cost": {
                      "white": 1,
                      "blue": 0,
                      "green": 1,
                      "red": 2,
                      "black": 1
                    }
                  },
                  {
                    "id": "card.blue.2",
                    "tier": 1,
                    "bonus": "blue",
                    "points": 0,
                    "cost": {
                      "white": 1,
                      "blue": 0,
                      "green": 2,
                      "red": 2,
                      "black": 0
                    }
                  },
                  {
                    "id": "card.blue.3",
                    "tier": 1,
                    "bonus": "blue",
                    "points": 0,
                    "cost": {
                      "white": 0,
                      "blue": 1,
                      "green": 3,
                      "red": 1,
                      "black": 0
                    }
                  },
                  {
                    "id": "card.green.0",
                    "tier": 1,
                    "bonus": "green",
                    "points": 0,
                    "cost": {
                      "white": 1,
                      "blue": 1,
                      "green": 0,
                      "red": 1,
                      "black": 1
                    }
                  },
                  {
                    "id": "card.green.1",
                    "tier": 1,
                    "bonus": "green",
                    "points": 0,
                    "cost": {
                      "white": 1,
                      "blue": 1,
                      "green": 0,
                      "red": 1,
                      "black": 2
                    }
                  },
                  {
                    "id": "card.green.2",
                    "tier": 1,
                    "bonus": "green",
                    "points": 0,
                    "cost": {
                      "white": 0,
                      "blue": 1,
                      "green": 0,
                      "red": 2,
                      "black": 2
                    }
                  },
                  {
                    "id": "card.green.4",
                    "tier": 1,
                    "bonus": "green",
                    "points": 0,
                    "cost": {
                      "white": 2,
                      "blue": 1,
                      "green": 0,
                      "red": 0,
                      "black": 0
                    }
                  }
                ],
                "nobles": [
                  {
                    "id": "noble.2",
                    "name": "白塔夫人",
                    "points": 3,
                    "requirement": {
                      "white": 4,
                      "blue": 4,
                      "green": 0,
                      "red": 0,
                      "black": 0
                    }
                  }
                ],
                "reservedCount": 0,
                "bonuses": {
                  "white": 4,
                  "blue": 4,
                  "green": 4,
                  "red": 0,
                  "black": 0
                },
                "score": 3
              },
              "tutorial.opponent": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              }
            },
            "legalActions": []
          },
          "events": [
            {
              "type": "turn.played",
              "seatId": "tutorial.you",
              "action": "buy",
              "cardId": "card.green.4",
              "eventId": "noble.0.0"
            },
            {
              "type": "turn.played",
              "seatId": "tutorial.you",
              "action": "noble",
              "eventId": "noble.1.0"
            },
            {
              "type": "noble.arrived",
              "seatId": "tutorial.you",
              "nobleId": "noble.2",
              "eventId": "noble.1.1"
            }
          ]
        }
      ]
    },
    {
      "id": "final-round",
      "initial": {
        "bank": {
          "white": 0,
          "blue": 4,
          "green": 4,
          "red": 4,
          "black": 4,
          "gold": 4
        },
        "market": [
          [
            {
              "id": "card.black.7",
              "tier": 1,
              "bonus": "black",
              "points": 1,
              "cost": {
                "white": 0,
                "blue": 4,
                "green": 0,
                "red": 0,
                "black": 0
              }
            },
            {
              "id": "card.black.0",
              "tier": 1,
              "bonus": "black",
              "points": 0,
              "cost": {
                "white": 1,
                "blue": 1,
                "green": 1,
                "red": 1,
                "black": 0
              }
            },
            {
              "id": "card.green.1",
              "tier": 1,
              "bonus": "green",
              "points": 0,
              "cost": {
                "white": 1,
                "blue": 1,
                "green": 0,
                "red": 1,
                "black": 2
              }
            },
            {
              "id": "card.red.0",
              "tier": 1,
              "bonus": "red",
              "points": 0,
              "cost": {
                "white": 1,
                "blue": 1,
                "green": 1,
                "red": 0,
                "black": 1
              }
            }
          ],
          [
            {
              "id": "card.white.13",
              "tier": 2,
              "bonus": "white",
              "points": 3,
              "cost": {
                "white": 6,
                "blue": 0,
                "green": 0,
                "red": 0,
                "black": 0
              }
            },
            {
              "id": "card.red.8",
              "tier": 2,
              "bonus": "red",
              "points": 1,
              "cost": {
                "white": 2,
                "blue": 0,
                "green": 0,
                "red": 2,
                "black": 3
              }
            },
            {
              "id": "card.blue.9",
              "tier": 2,
              "bonus": "blue",
              "points": 1,
              "cost": {
                "white": 0,
                "blue": 2,
                "green": 3,
                "red": 0,
                "black": 3
              }
            },
            {
              "id": "card.green.13",
              "tier": 2,
              "bonus": "green",
              "points": 3,
              "cost": {
                "white": 0,
                "blue": 0,
                "green": 6,
                "red": 0,
                "black": 0
              }
            }
          ],
          [
            {
              "id": "card.white.17",
              "tier": 3,
              "bonus": "white",
              "points": 5,
              "cost": {
                "white": 3,
                "blue": 0,
                "green": 0,
                "red": 0,
                "black": 7
              }
            },
            {
              "id": "card.red.14",
              "tier": 3,
              "bonus": "red",
              "points": 3,
              "cost": {
                "white": 3,
                "blue": 5,
                "green": 3,
                "red": 0,
                "black": 3
              }
            },
            {
              "id": "card.green.14",
              "tier": 3,
              "bonus": "green",
              "points": 3,
              "cost": {
                "white": 5,
                "blue": 3,
                "green": 0,
                "red": 3,
                "black": 3
              }
            },
            {
              "id": "card.black.16",
              "tier": 3,
              "bonus": "black",
              "points": 4,
              "cost": {
                "white": 0,
                "blue": 0,
                "green": 3,
                "red": 6,
                "black": 3
              }
            }
          ]
        ],
        "deckCounts": [
          36,
          26,
          13
        ],
        "players": {
          "tutorial.you": {
            "tokens": {
              "white": 4,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 1
            },
            "purchased": [
              {
                "id": "card.white.15",
                "tier": 3,
                "bonus": "white",
                "points": 4,
                "cost": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 7
                }
              },
              {
                "id": "card.blue.15",
                "tier": 3,
                "bonus": "blue",
                "points": 4,
                "cost": {
                  "white": 7,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                }
              },
              {
                "id": "card.green.15",
                "tier": 3,
                "bonus": "green",
                "points": 4,
                "cost": {
                  "white": 0,
                  "blue": 7,
                  "green": 0,
                  "red": 0,
                  "black": 0
                }
              }
            ],
            "nobles": [],
            "reservedCount": 0,
            "bonuses": {
              "white": 1,
              "blue": 1,
              "green": 1,
              "red": 0,
              "black": 0
            },
            "score": 12
          },
          "tutorial.opponent": {
            "tokens": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 0
            },
            "purchased": [],
            "nobles": [],
            "reservedCount": 0,
            "bonuses": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0
            },
            "score": 0
          }
        },
        "legalActions": [
          {
            "type": "take",
            "colors": [
              "blue",
              "green",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "green",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "green",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "blue"
            ]
          },
          {
            "type": "take",
            "colors": [
              "green",
              "green"
            ]
          },
          {
            "type": "take",
            "colors": [
              "red",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "black",
              "black"
            ]
          },
          {
            "type": "reserve",
            "cardId": "card.black.7"
          },
          {
            "type": "reserve",
            "cardId": "card.black.0"
          },
          {
            "type": "reserve",
            "cardId": "card.green.1"
          },
          {
            "type": "reserve",
            "cardId": "card.red.0"
          },
          {
            "type": "reserve",
            "cardId": "card.white.13"
          },
          {
            "type": "reserve",
            "cardId": "card.red.8"
          },
          {
            "type": "reserve",
            "cardId": "card.blue.9"
          },
          {
            "type": "reserve",
            "cardId": "card.green.13"
          },
          {
            "type": "reserve",
            "cardId": "card.white.17"
          },
          {
            "type": "reserve",
            "cardId": "card.red.14"
          },
          {
            "type": "reserve",
            "cardId": "card.green.14"
          },
          {
            "type": "reserve",
            "cardId": "card.black.16"
          },
          {
            "type": "reserve_deck",
            "tier": 1
          },
          {
            "type": "reserve_deck",
            "tier": 2
          },
          {
            "type": "reserve_deck",
            "tier": 3
          },
          {
            "type": "buy",
            "cardId": "card.black.0",
            "payment": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 1
            }
          },
          {
            "type": "buy",
            "cardId": "card.red.0",
            "payment": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 1
            }
          },
          {
            "type": "buy",
            "cardId": "card.white.13",
            "payment": {
              "white": 4,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 1
            }
          }
        ]
      },
      "moves": [
        {
          "action": {
            "type": "buy",
            "cardId": "card.white.13",
            "payment": {
              "white": 4,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 1
            }
          },
          "changes": {
            "currentSeatId": "tutorial.opponent",
            "turn": 1,
            "finalRound": true,
            "bank": {
              "white": 4,
              "blue": 4,
              "green": 4,
              "red": 4,
              "black": 4,
              "gold": 5
            },
            "market": [
              [
                {
                  "id": "card.black.7",
                  "tier": 1,
                  "bonus": "black",
                  "points": 1,
                  "cost": {
                    "white": 0,
                    "blue": 4,
                    "green": 0,
                    "red": 0,
                    "black": 0
                  }
                },
                {
                  "id": "card.black.0",
                  "tier": 1,
                  "bonus": "black",
                  "points": 0,
                  "cost": {
                    "white": 1,
                    "blue": 1,
                    "green": 1,
                    "red": 1,
                    "black": 0
                  }
                },
                {
                  "id": "card.green.1",
                  "tier": 1,
                  "bonus": "green",
                  "points": 0,
                  "cost": {
                    "white": 1,
                    "blue": 1,
                    "green": 0,
                    "red": 1,
                    "black": 2
                  }
                },
                {
                  "id": "card.red.0",
                  "tier": 1,
                  "bonus": "red",
                  "points": 0,
                  "cost": {
                    "white": 1,
                    "blue": 1,
                    "green": 1,
                    "red": 0,
                    "black": 1
                  }
                }
              ],
              [
                {
                  "id": "card.black.12",
                  "tier": 2,
                  "bonus": "black",
                  "points": 2,
                  "cost": {
                    "white": 5,
                    "blue": 0,
                    "green": 0,
                    "red": 0,
                    "black": 0
                  }
                },
                {
                  "id": "card.red.8",
                  "tier": 2,
                  "bonus": "red",
                  "points": 1,
                  "cost": {
                    "white": 2,
                    "blue": 0,
                    "green": 0,
                    "red": 2,
                    "black": 3
                  }
                },
                {
                  "id": "card.blue.9",
                  "tier": 2,
                  "bonus": "blue",
                  "points": 1,
                  "cost": {
                    "white": 0,
                    "blue": 2,
                    "green": 3,
                    "red": 0,
                    "black": 3
                  }
                },
                {
                  "id": "card.green.13",
                  "tier": 2,
                  "bonus": "green",
                  "points": 3,
                  "cost": {
                    "white": 0,
                    "blue": 0,
                    "green": 6,
                    "red": 0,
                    "black": 0
                  }
                }
              ],
              [
                {
                  "id": "card.white.17",
                  "tier": 3,
                  "bonus": "white",
                  "points": 5,
                  "cost": {
                    "white": 3,
                    "blue": 0,
                    "green": 0,
                    "red": 0,
                    "black": 7
                  }
                },
                {
                  "id": "card.red.14",
                  "tier": 3,
                  "bonus": "red",
                  "points": 3,
                  "cost": {
                    "white": 3,
                    "blue": 5,
                    "green": 3,
                    "red": 0,
                    "black": 3
                  }
                },
                {
                  "id": "card.green.14",
                  "tier": 3,
                  "bonus": "green",
                  "points": 3,
                  "cost": {
                    "white": 5,
                    "blue": 3,
                    "green": 0,
                    "red": 3,
                    "black": 3
                  }
                },
                {
                  "id": "card.black.16",
                  "tier": 3,
                  "bonus": "black",
                  "points": 4,
                  "cost": {
                    "white": 0,
                    "blue": 0,
                    "green": 3,
                    "red": 6,
                    "black": 3
                  }
                }
              ]
            ],
            "deckCounts": [
              36,
              25,
              13
            ],
            "players": {
              "tutorial.you": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [
                  {
                    "id": "card.white.15",
                    "tier": 3,
                    "bonus": "white",
                    "points": 4,
                    "cost": {
                      "white": 0,
                      "blue": 0,
                      "green": 0,
                      "red": 0,
                      "black": 7
                    }
                  },
                  {
                    "id": "card.blue.15",
                    "tier": 3,
                    "bonus": "blue",
                    "points": 4,
                    "cost": {
                      "white": 7,
                      "blue": 0,
                      "green": 0,
                      "red": 0,
                      "black": 0
                    }
                  },
                  {
                    "id": "card.green.15",
                    "tier": 3,
                    "bonus": "green",
                    "points": 4,
                    "cost": {
                      "white": 0,
                      "blue": 7,
                      "green": 0,
                      "red": 0,
                      "black": 0
                    }
                  },
                  {
                    "id": "card.white.13",
                    "tier": 2,
                    "bonus": "white",
                    "points": 3,
                    "cost": {
                      "white": 6,
                      "blue": 0,
                      "green": 0,
                      "red": 0,
                      "black": 0
                    }
                  }
                ],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 2,
                  "blue": 1,
                  "green": 1,
                  "red": 0,
                  "black": 0
                },
                "score": 15
              },
              "tutorial.opponent": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              }
            },
            "legalActions": []
          },
          "events": [
            {
              "type": "turn.played",
              "seatId": "tutorial.you",
              "action": "buy",
              "cardId": "card.white.13",
              "eventId": "final-round.0.0"
            }
          ]
        }
      ]
    },
    {
      "id": "finish",
      "initial": {
        "seats": [
          "tutorial.opponent",
          "tutorial.you"
        ],
        "turn": 1,
        "finalRound": true,
        "bank": {
          "white": 4,
          "blue": 4,
          "green": 4,
          "red": 2,
          "black": 3,
          "gold": 5
        },
        "market": [
          [
            {
              "id": "card.white.4",
              "tier": 1,
              "bonus": "white",
              "points": 0,
              "cost": {
                "white": 0,
                "blue": 0,
                "green": 0,
                "red": 2,
                "black": 1
              }
            },
            {
              "id": "card.black.0",
              "tier": 1,
              "bonus": "black",
              "points": 0,
              "cost": {
                "white": 1,
                "blue": 1,
                "green": 1,
                "red": 1,
                "black": 0
              }
            },
            {
              "id": "card.green.1",
              "tier": 1,
              "bonus": "green",
              "points": 0,
              "cost": {
                "white": 1,
                "blue": 1,
                "green": 0,
                "red": 1,
                "black": 2
              }
            },
            {
              "id": "card.red.0",
              "tier": 1,
              "bonus": "red",
              "points": 0,
              "cost": {
                "white": 1,
                "blue": 1,
                "green": 1,
                "red": 0,
                "black": 1
              }
            }
          ],
          [
            {
              "id": "card.white.13",
              "tier": 2,
              "bonus": "white",
              "points": 3,
              "cost": {
                "white": 6,
                "blue": 0,
                "green": 0,
                "red": 0,
                "black": 0
              }
            },
            {
              "id": "card.red.8",
              "tier": 2,
              "bonus": "red",
              "points": 1,
              "cost": {
                "white": 2,
                "blue": 0,
                "green": 0,
                "red": 2,
                "black": 3
              }
            },
            {
              "id": "card.blue.9",
              "tier": 2,
              "bonus": "blue",
              "points": 1,
              "cost": {
                "white": 0,
                "blue": 2,
                "green": 3,
                "red": 0,
                "black": 3
              }
            },
            {
              "id": "card.green.13",
              "tier": 2,
              "bonus": "green",
              "points": 3,
              "cost": {
                "white": 0,
                "blue": 0,
                "green": 6,
                "red": 0,
                "black": 0
              }
            }
          ],
          [
            {
              "id": "card.white.17",
              "tier": 3,
              "bonus": "white",
              "points": 5,
              "cost": {
                "white": 3,
                "blue": 0,
                "green": 0,
                "red": 0,
                "black": 7
              }
            },
            {
              "id": "card.red.14",
              "tier": 3,
              "bonus": "red",
              "points": 3,
              "cost": {
                "white": 3,
                "blue": 5,
                "green": 3,
                "red": 0,
                "black": 3
              }
            },
            {
              "id": "card.green.14",
              "tier": 3,
              "bonus": "green",
              "points": 3,
              "cost": {
                "white": 5,
                "blue": 3,
                "green": 0,
                "red": 3,
                "black": 3
              }
            },
            {
              "id": "card.black.16",
              "tier": 3,
              "bonus": "black",
              "points": 4,
              "cost": {
                "white": 0,
                "blue": 0,
                "green": 3,
                "red": 6,
                "black": 3
              }
            }
          ]
        ],
        "deckCounts": [
          36,
          25,
          13
        ],
        "players": {
          "tutorial.opponent": {
            "tokens": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0,
              "gold": 0
            },
            "purchased": [
              {
                "id": "card.white.15",
                "tier": 3,
                "bonus": "white",
                "points": 4,
                "cost": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 7
                }
              },
              {
                "id": "card.blue.15",
                "tier": 3,
                "bonus": "blue",
                "points": 4,
                "cost": {
                  "white": 7,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                }
              },
              {
                "id": "card.green.15",
                "tier": 3,
                "bonus": "green",
                "points": 4,
                "cost": {
                  "white": 0,
                  "blue": 7,
                  "green": 0,
                  "red": 0,
                  "black": 0
                }
              },
              {
                "id": "card.red.13",
                "tier": 2,
                "bonus": "red",
                "points": 3,
                "cost": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 6,
                  "black": 0
                }
              }
            ],
            "nobles": [],
            "reservedCount": 0,
            "bonuses": {
              "white": 1,
              "blue": 1,
              "green": 1,
              "red": 1,
              "black": 0
            },
            "score": 15
          },
          "tutorial.you": {
            "tokens": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 2,
              "black": 1,
              "gold": 0
            },
            "purchased": [],
            "nobles": [],
            "reservedCount": 0,
            "bonuses": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 0,
              "black": 0
            },
            "score": 0
          }
        },
        "legalActions": [
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "green"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "blue",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "green",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "green",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "green",
              "red"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "green",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "green",
              "red",
              "black"
            ]
          },
          {
            "type": "take",
            "colors": [
              "white",
              "white"
            ]
          },
          {
            "type": "take",
            "colors": [
              "blue",
              "blue"
            ]
          },
          {
            "type": "take",
            "colors": [
              "green",
              "green"
            ]
          },
          {
            "type": "reserve",
            "cardId": "card.white.4"
          },
          {
            "type": "reserve",
            "cardId": "card.black.0"
          },
          {
            "type": "reserve",
            "cardId": "card.green.1"
          },
          {
            "type": "reserve",
            "cardId": "card.red.0"
          },
          {
            "type": "reserve",
            "cardId": "card.white.13"
          },
          {
            "type": "reserve",
            "cardId": "card.red.8"
          },
          {
            "type": "reserve",
            "cardId": "card.blue.9"
          },
          {
            "type": "reserve",
            "cardId": "card.green.13"
          },
          {
            "type": "reserve",
            "cardId": "card.white.17"
          },
          {
            "type": "reserve",
            "cardId": "card.red.14"
          },
          {
            "type": "reserve",
            "cardId": "card.green.14"
          },
          {
            "type": "reserve",
            "cardId": "card.black.16"
          },
          {
            "type": "reserve_deck",
            "tier": 1
          },
          {
            "type": "reserve_deck",
            "tier": 2
          },
          {
            "type": "reserve_deck",
            "tier": 3
          },
          {
            "type": "buy",
            "cardId": "card.white.4",
            "payment": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 2,
              "black": 1,
              "gold": 0
            }
          }
        ]
      },
      "moves": [
        {
          "action": {
            "type": "buy",
            "cardId": "card.white.4",
            "payment": {
              "white": 0,
              "blue": 0,
              "green": 0,
              "red": 2,
              "black": 1,
              "gold": 0
            }
          },
          "changes": {
            "phase": "finished",
            "bank": {
              "white": 4,
              "blue": 4,
              "green": 4,
              "red": 4,
              "black": 4,
              "gold": 5
            },
            "market": [
              [
                {
                  "id": "card.black.7",
                  "tier": 1,
                  "bonus": "black",
                  "points": 1,
                  "cost": {
                    "white": 0,
                    "blue": 4,
                    "green": 0,
                    "red": 0,
                    "black": 0
                  }
                },
                {
                  "id": "card.black.0",
                  "tier": 1,
                  "bonus": "black",
                  "points": 0,
                  "cost": {
                    "white": 1,
                    "blue": 1,
                    "green": 1,
                    "red": 1,
                    "black": 0
                  }
                },
                {
                  "id": "card.green.1",
                  "tier": 1,
                  "bonus": "green",
                  "points": 0,
                  "cost": {
                    "white": 1,
                    "blue": 1,
                    "green": 0,
                    "red": 1,
                    "black": 2
                  }
                },
                {
                  "id": "card.red.0",
                  "tier": 1,
                  "bonus": "red",
                  "points": 0,
                  "cost": {
                    "white": 1,
                    "blue": 1,
                    "green": 1,
                    "red": 0,
                    "black": 1
                  }
                }
              ],
              [
                {
                  "id": "card.white.13",
                  "tier": 2,
                  "bonus": "white",
                  "points": 3,
                  "cost": {
                    "white": 6,
                    "blue": 0,
                    "green": 0,
                    "red": 0,
                    "black": 0
                  }
                },
                {
                  "id": "card.red.8",
                  "tier": 2,
                  "bonus": "red",
                  "points": 1,
                  "cost": {
                    "white": 2,
                    "blue": 0,
                    "green": 0,
                    "red": 2,
                    "black": 3
                  }
                },
                {
                  "id": "card.blue.9",
                  "tier": 2,
                  "bonus": "blue",
                  "points": 1,
                  "cost": {
                    "white": 0,
                    "blue": 2,
                    "green": 3,
                    "red": 0,
                    "black": 3
                  }
                },
                {
                  "id": "card.green.13",
                  "tier": 2,
                  "bonus": "green",
                  "points": 3,
                  "cost": {
                    "white": 0,
                    "blue": 0,
                    "green": 6,
                    "red": 0,
                    "black": 0
                  }
                }
              ],
              [
                {
                  "id": "card.white.17",
                  "tier": 3,
                  "bonus": "white",
                  "points": 5,
                  "cost": {
                    "white": 3,
                    "blue": 0,
                    "green": 0,
                    "red": 0,
                    "black": 7
                  }
                },
                {
                  "id": "card.red.14",
                  "tier": 3,
                  "bonus": "red",
                  "points": 3,
                  "cost": {
                    "white": 3,
                    "blue": 5,
                    "green": 3,
                    "red": 0,
                    "black": 3
                  }
                },
                {
                  "id": "card.green.14",
                  "tier": 3,
                  "bonus": "green",
                  "points": 3,
                  "cost": {
                    "white": 5,
                    "blue": 3,
                    "green": 0,
                    "red": 3,
                    "black": 3
                  }
                },
                {
                  "id": "card.black.16",
                  "tier": 3,
                  "bonus": "black",
                  "points": 4,
                  "cost": {
                    "white": 0,
                    "blue": 0,
                    "green": 3,
                    "red": 6,
                    "black": 3
                  }
                }
              ]
            ],
            "deckCounts": [
              35,
              25,
              13
            ],
            "players": {
              "tutorial.opponent": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [
                  {
                    "id": "card.white.15",
                    "tier": 3,
                    "bonus": "white",
                    "points": 4,
                    "cost": {
                      "white": 0,
                      "blue": 0,
                      "green": 0,
                      "red": 0,
                      "black": 7
                    }
                  },
                  {
                    "id": "card.blue.15",
                    "tier": 3,
                    "bonus": "blue",
                    "points": 4,
                    "cost": {
                      "white": 7,
                      "blue": 0,
                      "green": 0,
                      "red": 0,
                      "black": 0
                    }
                  },
                  {
                    "id": "card.green.15",
                    "tier": 3,
                    "bonus": "green",
                    "points": 4,
                    "cost": {
                      "white": 0,
                      "blue": 7,
                      "green": 0,
                      "red": 0,
                      "black": 0
                    }
                  },
                  {
                    "id": "card.red.13",
                    "tier": 2,
                    "bonus": "red",
                    "points": 3,
                    "cost": {
                      "white": 0,
                      "blue": 0,
                      "green": 0,
                      "red": 6,
                      "black": 0
                    }
                  }
                ],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 1,
                  "blue": 1,
                  "green": 1,
                  "red": 1,
                  "black": 0
                },
                "score": 15
              },
              "tutorial.you": {
                "tokens": {
                  "white": 0,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0,
                  "gold": 0
                },
                "purchased": [
                  {
                    "id": "card.white.4",
                    "tier": 1,
                    "bonus": "white",
                    "points": 0,
                    "cost": {
                      "white": 0,
                      "blue": 0,
                      "green": 0,
                      "red": 2,
                      "black": 1
                    }
                  }
                ],
                "nobles": [],
                "reservedCount": 0,
                "bonuses": {
                  "white": 1,
                  "blue": 0,
                  "green": 0,
                  "red": 0,
                  "black": 0
                },
                "score": 0
              }
            },
            "legalActions": [],
            "outcome": {
              "status": "finished",
              "scores": {
                "tutorial.opponent": 15,
                "tutorial.you": 0
              },
              "winners": [
                "tutorial.opponent"
              ],
              "reason": "prestige"
            }
          },
          "events": [
            {
              "type": "turn.played",
              "seatId": "tutorial.you",
              "action": "buy",
              "cardId": "card.white.4",
              "eventId": "finish.0.0"
            },
            {
              "type": "match.finished",
              "winners": [
                "tutorial.opponent"
              ],
              "eventId": "finish.0.1"
            }
          ]
        }
      ]
    }
  ]
};
