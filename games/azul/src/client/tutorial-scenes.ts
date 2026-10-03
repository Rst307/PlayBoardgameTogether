// Synthetic public projections. Regenerate: pnpm exec tsx scripts/generate-azul-tutorial.ts
export const practiceScenes: unknown = {
  "base": {
    "seats": [
      "tutorial.you",
      "tutorial.opponent"
    ],
    "viewingSeatId": "tutorial.you",
    "currentSeatId": "tutorial.you",
    "round": 1,
    "phase": "drafting",
    "factories": [
      [
        "blue",
        "blue",
        "yellow",
        "red"
      ],
      [
        "white"
      ],
      [],
      [],
      []
    ],
    "center": [],
    "firstAvailable": true,
    "nextStarter": null,
    "bagCount": 95,
    "players": {
      "tutorial.you": {
        "score": 0,
        "lines": [
          {
            "color": null,
            "count": 0
          },
          {
            "color": null,
            "count": 0
          },
          {
            "color": null,
            "count": 0
          },
          {
            "color": null,
            "count": 0
          },
          {
            "color": null,
            "count": 0
          }
        ],
        "wall": [
          [
            false,
            false,
            false,
            false,
            false
          ],
          [
            false,
            false,
            false,
            false,
            false
          ],
          [
            false,
            false,
            false,
            false,
            false
          ],
          [
            false,
            false,
            false,
            false,
            false
          ],
          [
            false,
            false,
            false,
            false,
            false
          ]
        ],
        "floor": []
      },
      "tutorial.opponent": {
        "score": 0,
        "lines": [
          {
            "color": null,
            "count": 0
          },
          {
            "color": null,
            "count": 0
          },
          {
            "color": null,
            "count": 0
          },
          {
            "color": null,
            "count": 0
          },
          {
            "color": null,
            "count": 0
          }
        ],
        "wall": [
          [
            false,
            false,
            false,
            false,
            false
          ],
          [
            false,
            false,
            false,
            false,
            false
          ],
          [
            false,
            false,
            false,
            false,
            false
          ],
          [
            false,
            false,
            false,
            false,
            false
          ],
          [
            false,
            false,
            false,
            false,
            false
          ]
        ],
        "floor": []
      }
    },
    "legalActions": [
      {
        "type": "draft",
        "source": 0,
        "color": "blue",
        "row": 0
      },
      {
        "type": "draft",
        "source": 0,
        "color": "blue",
        "row": 1
      },
      {
        "type": "draft",
        "source": 0,
        "color": "blue",
        "row": 2
      },
      {
        "type": "draft",
        "source": 0,
        "color": "blue",
        "row": 3
      },
      {
        "type": "draft",
        "source": 0,
        "color": "blue",
        "row": 4
      },
      {
        "type": "draft",
        "source": 0,
        "color": "blue",
        "row": -1
      },
      {
        "type": "draft",
        "source": 0,
        "color": "yellow",
        "row": 0
      },
      {
        "type": "draft",
        "source": 0,
        "color": "yellow",
        "row": 1
      },
      {
        "type": "draft",
        "source": 0,
        "color": "yellow",
        "row": 2
      },
      {
        "type": "draft",
        "source": 0,
        "color": "yellow",
        "row": 3
      },
      {
        "type": "draft",
        "source": 0,
        "color": "yellow",
        "row": 4
      },
      {
        "type": "draft",
        "source": 0,
        "color": "yellow",
        "row": -1
      },
      {
        "type": "draft",
        "source": 0,
        "color": "red",
        "row": 0
      },
      {
        "type": "draft",
        "source": 0,
        "color": "red",
        "row": 1
      },
      {
        "type": "draft",
        "source": 0,
        "color": "red",
        "row": 2
      },
      {
        "type": "draft",
        "source": 0,
        "color": "red",
        "row": 3
      },
      {
        "type": "draft",
        "source": 0,
        "color": "red",
        "row": 4
      },
      {
        "type": "draft",
        "source": 0,
        "color": "red",
        "row": -1
      },
      {
        "type": "draft",
        "source": 1,
        "color": "white",
        "row": 0
      },
      {
        "type": "draft",
        "source": 1,
        "color": "white",
        "row": 1
      },
      {
        "type": "draft",
        "source": 1,
        "color": "white",
        "row": 2
      },
      {
        "type": "draft",
        "source": 1,
        "color": "white",
        "row": 3
      },
      {
        "type": "draft",
        "source": 1,
        "color": "white",
        "row": 4
      },
      {
        "type": "draft",
        "source": 1,
        "color": "white",
        "row": -1
      }
    ],
    "lastRound": [],
    "outcome": {
      "status": "ongoing"
    }
  },
  "scenes": [
    {
      "id": "factory",
      "initial": {},
      "action": {
        "type": "draft",
        "source": 0,
        "color": "blue",
        "row": 1
      },
      "changes": {
        "currentSeatId": "tutorial.opponent",
        "factories": [
          [],
          [
            "white"
          ],
          [],
          [],
          []
        ],
        "center": [
          "yellow",
          "red"
        ],
        "players": {
          "tutorial.you": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": "blue",
                "count": 2
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          },
          "tutorial.opponent": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          }
        },
        "legalActions": []
      },
      "events": [
        {
          "type": "tiles.drafted",
          "seatId": "tutorial.you",
          "color": "blue",
          "count": 2,
          "row": 1,
          "source": 0,
          "eventId": "tutorial.azul.factory.0"
        }
      ]
    },
    {
      "id": "pattern",
      "initial": {
        "bagCount": 93,
        "players": {
          "tutorial.you": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": "blue",
                "count": 1
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                true,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          },
          "tutorial.opponent": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          }
        },
        "legalActions": [
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 0
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 2
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 3
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 4
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": -1
          },
          {
            "type": "draft",
            "source": 0,
            "color": "yellow",
            "row": 0
          },
          {
            "type": "draft",
            "source": 0,
            "color": "yellow",
            "row": 1
          },
          {
            "type": "draft",
            "source": 0,
            "color": "yellow",
            "row": 3
          },
          {
            "type": "draft",
            "source": 0,
            "color": "yellow",
            "row": 4
          },
          {
            "type": "draft",
            "source": 0,
            "color": "yellow",
            "row": -1
          },
          {
            "type": "draft",
            "source": 0,
            "color": "red",
            "row": 0
          },
          {
            "type": "draft",
            "source": 0,
            "color": "red",
            "row": 1
          },
          {
            "type": "draft",
            "source": 0,
            "color": "red",
            "row": 3
          },
          {
            "type": "draft",
            "source": 0,
            "color": "red",
            "row": 4
          },
          {
            "type": "draft",
            "source": 0,
            "color": "red",
            "row": -1
          },
          {
            "type": "draft",
            "source": 1,
            "color": "white",
            "row": 0
          },
          {
            "type": "draft",
            "source": 1,
            "color": "white",
            "row": 1
          },
          {
            "type": "draft",
            "source": 1,
            "color": "white",
            "row": 3
          },
          {
            "type": "draft",
            "source": 1,
            "color": "white",
            "row": 4
          },
          {
            "type": "draft",
            "source": 1,
            "color": "white",
            "row": -1
          }
        ]
      },
      "action": {
        "type": "draft",
        "source": 0,
        "color": "blue",
        "row": 2
      },
      "changes": {
        "currentSeatId": "tutorial.opponent",
        "factories": [
          [],
          [
            "white"
          ],
          [],
          [],
          []
        ],
        "center": [
          "yellow",
          "red"
        ],
        "players": {
          "tutorial.you": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": "blue",
                "count": 3
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                true,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          },
          "tutorial.opponent": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          }
        },
        "legalActions": []
      },
      "events": [
        {
          "type": "tiles.drafted",
          "seatId": "tutorial.you",
          "color": "blue",
          "count": 2,
          "row": 2,
          "source": 0,
          "eventId": "tutorial.azul.pattern.0"
        }
      ]
    },
    {
      "id": "overflow",
      "initial": {},
      "action": {
        "type": "draft",
        "source": 0,
        "color": "blue",
        "row": 0
      },
      "changes": {
        "currentSeatId": "tutorial.opponent",
        "factories": [
          [],
          [
            "white"
          ],
          [],
          [],
          []
        ],
        "center": [
          "yellow",
          "red"
        ],
        "players": {
          "tutorial.you": {
            "score": 0,
            "lines": [
              {
                "color": "blue",
                "count": 1
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": [
              "blue"
            ]
          },
          "tutorial.opponent": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          }
        },
        "legalActions": []
      },
      "events": [
        {
          "type": "tiles.drafted",
          "seatId": "tutorial.you",
          "color": "blue",
          "count": 2,
          "row": 0,
          "source": 0,
          "eventId": "tutorial.azul.overflow.0"
        }
      ]
    },
    {
      "id": "first",
      "initial": {
        "center": [
          "yellow",
          "yellow",
          "red"
        ],
        "bagCount": 92,
        "legalActions": [
          {
            "type": "draft",
            "source": -1,
            "color": "yellow",
            "row": 0
          },
          {
            "type": "draft",
            "source": -1,
            "color": "yellow",
            "row": 1
          },
          {
            "type": "draft",
            "source": -1,
            "color": "yellow",
            "row": 2
          },
          {
            "type": "draft",
            "source": -1,
            "color": "yellow",
            "row": 3
          },
          {
            "type": "draft",
            "source": -1,
            "color": "yellow",
            "row": 4
          },
          {
            "type": "draft",
            "source": -1,
            "color": "yellow",
            "row": -1
          },
          {
            "type": "draft",
            "source": -1,
            "color": "red",
            "row": 0
          },
          {
            "type": "draft",
            "source": -1,
            "color": "red",
            "row": 1
          },
          {
            "type": "draft",
            "source": -1,
            "color": "red",
            "row": 2
          },
          {
            "type": "draft",
            "source": -1,
            "color": "red",
            "row": 3
          },
          {
            "type": "draft",
            "source": -1,
            "color": "red",
            "row": 4
          },
          {
            "type": "draft",
            "source": -1,
            "color": "red",
            "row": -1
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 0
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 1
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 2
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 3
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 4
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": -1
          },
          {
            "type": "draft",
            "source": 0,
            "color": "yellow",
            "row": 0
          },
          {
            "type": "draft",
            "source": 0,
            "color": "yellow",
            "row": 1
          },
          {
            "type": "draft",
            "source": 0,
            "color": "yellow",
            "row": 2
          },
          {
            "type": "draft",
            "source": 0,
            "color": "yellow",
            "row": 3
          },
          {
            "type": "draft",
            "source": 0,
            "color": "yellow",
            "row": 4
          },
          {
            "type": "draft",
            "source": 0,
            "color": "yellow",
            "row": -1
          },
          {
            "type": "draft",
            "source": 0,
            "color": "red",
            "row": 0
          },
          {
            "type": "draft",
            "source": 0,
            "color": "red",
            "row": 1
          },
          {
            "type": "draft",
            "source": 0,
            "color": "red",
            "row": 2
          },
          {
            "type": "draft",
            "source": 0,
            "color": "red",
            "row": 3
          },
          {
            "type": "draft",
            "source": 0,
            "color": "red",
            "row": 4
          },
          {
            "type": "draft",
            "source": 0,
            "color": "red",
            "row": -1
          },
          {
            "type": "draft",
            "source": 1,
            "color": "white",
            "row": 0
          },
          {
            "type": "draft",
            "source": 1,
            "color": "white",
            "row": 1
          },
          {
            "type": "draft",
            "source": 1,
            "color": "white",
            "row": 2
          },
          {
            "type": "draft",
            "source": 1,
            "color": "white",
            "row": 3
          },
          {
            "type": "draft",
            "source": 1,
            "color": "white",
            "row": 4
          },
          {
            "type": "draft",
            "source": 1,
            "color": "white",
            "row": -1
          }
        ]
      },
      "action": {
        "type": "draft",
        "source": -1,
        "color": "yellow",
        "row": 1
      },
      "changes": {
        "currentSeatId": "tutorial.opponent",
        "center": [
          "red"
        ],
        "firstAvailable": false,
        "nextStarter": "tutorial.you",
        "players": {
          "tutorial.you": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": "yellow",
                "count": 2
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": [
              "first"
            ]
          },
          "tutorial.opponent": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          }
        },
        "legalActions": []
      },
      "events": [
        {
          "type": "tiles.drafted",
          "seatId": "tutorial.you",
          "color": "yellow",
          "count": 2,
          "row": 1,
          "source": -1,
          "eventId": "tutorial.azul.first.0"
        }
      ]
    },
    {
      "id": "wall",
      "initial": {
        "factories": [
          [
            "blue"
          ],
          [],
          [],
          [],
          []
        ],
        "bagCount": 97,
        "players": {
          "tutorial.you": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": "red",
                "count": 2
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          },
          "tutorial.opponent": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          }
        },
        "legalActions": [
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 0
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 1
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 2
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 3
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": -1
          }
        ]
      },
      "action": {
        "type": "draft",
        "source": 0,
        "color": "blue",
        "row": 0
      },
      "changes": {
        "currentSeatId": "tutorial.opponent",
        "round": 2,
        "factories": [
          [
            "black",
            "red",
            "white",
            "black"
          ],
          [
            "blue",
            "red",
            "yellow",
            "black"
          ],
          [
            "white",
            "red",
            "yellow",
            "white"
          ],
          [
            "black",
            "yellow",
            "blue",
            "red"
          ],
          [
            "black",
            "black",
            "blue",
            "red"
          ]
        ],
        "bagCount": 77,
        "players": {
          "tutorial.you": {
            "score": 1,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": "red",
                "count": 2
              }
            ],
            "wall": [
              [
                true,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          },
          "tutorial.opponent": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          }
        },
        "legalActions": [],
        "lastRound": [
          {
            "seatId": "tutorial.you",
            "kind": "tile",
            "row": 0,
            "col": 0,
            "color": "blue",
            "points": 1,
            "from": 0,
            "total": 1,
            "cells": [
              {
                "row": 0,
                "col": 0
              }
            ],
            "label": "花砖落位"
          }
        ]
      },
      "events": [
        {
          "type": "tiles.drafted",
          "seatId": "tutorial.you",
          "color": "blue",
          "count": 1,
          "row": 0,
          "source": 0,
          "eventId": "tutorial.azul.wall.0"
        },
        {
          "type": "round.scored",
          "round": 1,
          "steps": [
            {
              "seatId": "tutorial.you",
              "kind": "tile",
              "row": 0,
              "col": 0,
              "color": "blue",
              "points": 1,
              "cells": [
                {
                  "row": 0,
                  "col": 0
                }
              ],
              "label": "花砖落位",
              "from": 0,
              "total": 1
            }
          ],
          "eventId": "tutorial.azul.wall.1"
        }
      ]
    },
    {
      "id": "cross",
      "initial": {
        "factories": [
          [
            "blue"
          ],
          [],
          [],
          [],
          []
        ],
        "bagCount": 93,
        "players": {
          "tutorial.you": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": "blue",
                "count": 2
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                true,
                false,
                false
              ],
              [
                false,
                true,
                false,
                true,
                false
              ],
              [
                false,
                false,
                true,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          },
          "tutorial.opponent": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          }
        },
        "legalActions": [
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 0
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 1
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 2
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 3
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 4
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": -1
          }
        ]
      },
      "action": {
        "type": "draft",
        "source": 0,
        "color": "blue",
        "row": 2
      },
      "changes": {
        "currentSeatId": "tutorial.opponent",
        "round": 2,
        "factories": [
          [
            "black",
            "red",
            "white",
            "black"
          ],
          [
            "blue",
            "red",
            "yellow",
            "black"
          ],
          [
            "white",
            "red",
            "yellow",
            "white"
          ],
          [
            "black",
            "yellow",
            "blue",
            "red"
          ],
          [
            "black",
            "black",
            "blue",
            "red"
          ]
        ],
        "bagCount": 73,
        "players": {
          "tutorial.you": {
            "score": 6,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                true,
                false,
                false
              ],
              [
                false,
                true,
                true,
                true,
                false
              ],
              [
                false,
                false,
                true,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          },
          "tutorial.opponent": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          }
        },
        "legalActions": [],
        "lastRound": [
          {
            "seatId": "tutorial.you",
            "kind": "tile",
            "row": 2,
            "col": 2,
            "color": "blue",
            "points": 6,
            "from": 0,
            "total": 6,
            "cells": [
              {
                "row": 2,
                "col": 2
              },
              {
                "row": 2,
                "col": 1
              },
              {
                "row": 2,
                "col": 3
              },
              {
                "row": 1,
                "col": 2
              },
              {
                "row": 3,
                "col": 2
              }
            ],
            "label": "交织连线"
          }
        ]
      },
      "events": [
        {
          "type": "tiles.drafted",
          "seatId": "tutorial.you",
          "color": "blue",
          "count": 1,
          "row": 2,
          "source": 0,
          "eventId": "tutorial.azul.cross.0"
        },
        {
          "type": "round.scored",
          "round": 1,
          "steps": [
            {
              "seatId": "tutorial.you",
              "kind": "tile",
              "row": 2,
              "col": 2,
              "color": "blue",
              "points": 6,
              "cells": [
                {
                  "row": 2,
                  "col": 2
                },
                {
                  "row": 2,
                  "col": 1
                },
                {
                  "row": 2,
                  "col": 3
                },
                {
                  "row": 1,
                  "col": 2
                },
                {
                  "row": 3,
                  "col": 2
                }
              ],
              "label": "交织连线",
              "from": 0,
              "total": 6
            }
          ],
          "eventId": "tutorial.azul.cross.1"
        }
      ]
    },
    {
      "id": "floor",
      "initial": {
        "factories": [
          [],
          [],
          [],
          [],
          []
        ],
        "center": [
          "red"
        ],
        "bagCount": 97,
        "players": {
          "tutorial.you": {
            "score": 1,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": [
              "yellow",
              "yellow"
            ]
          },
          "tutorial.opponent": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          }
        },
        "legalActions": [
          {
            "type": "draft",
            "source": -1,
            "color": "red",
            "row": 0
          },
          {
            "type": "draft",
            "source": -1,
            "color": "red",
            "row": 1
          },
          {
            "type": "draft",
            "source": -1,
            "color": "red",
            "row": 2
          },
          {
            "type": "draft",
            "source": -1,
            "color": "red",
            "row": 3
          },
          {
            "type": "draft",
            "source": -1,
            "color": "red",
            "row": 4
          },
          {
            "type": "draft",
            "source": -1,
            "color": "red",
            "row": -1
          }
        ]
      },
      "action": {
        "type": "draft",
        "source": -1,
        "color": "red",
        "row": -1
      },
      "changes": {
        "round": 2,
        "factories": [
          [
            "black",
            "red",
            "white",
            "black"
          ],
          [
            "blue",
            "red",
            "yellow",
            "black"
          ],
          [
            "white",
            "red",
            "yellow",
            "white"
          ],
          [
            "black",
            "yellow",
            "blue",
            "red"
          ],
          [
            "black",
            "black",
            "blue",
            "red"
          ]
        ],
        "center": [],
        "bagCount": 77,
        "players": {
          "tutorial.you": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          },
          "tutorial.opponent": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          }
        },
        "legalActions": [
          {
            "type": "draft",
            "source": 0,
            "color": "black",
            "row": 0
          },
          {
            "type": "draft",
            "source": 0,
            "color": "black",
            "row": 1
          },
          {
            "type": "draft",
            "source": 0,
            "color": "black",
            "row": 2
          },
          {
            "type": "draft",
            "source": 0,
            "color": "black",
            "row": 3
          },
          {
            "type": "draft",
            "source": 0,
            "color": "black",
            "row": 4
          },
          {
            "type": "draft",
            "source": 0,
            "color": "black",
            "row": -1
          },
          {
            "type": "draft",
            "source": 0,
            "color": "red",
            "row": 0
          },
          {
            "type": "draft",
            "source": 0,
            "color": "red",
            "row": 1
          },
          {
            "type": "draft",
            "source": 0,
            "color": "red",
            "row": 2
          },
          {
            "type": "draft",
            "source": 0,
            "color": "red",
            "row": 3
          },
          {
            "type": "draft",
            "source": 0,
            "color": "red",
            "row": 4
          },
          {
            "type": "draft",
            "source": 0,
            "color": "red",
            "row": -1
          },
          {
            "type": "draft",
            "source": 0,
            "color": "white",
            "row": 0
          },
          {
            "type": "draft",
            "source": 0,
            "color": "white",
            "row": 1
          },
          {
            "type": "draft",
            "source": 0,
            "color": "white",
            "row": 2
          },
          {
            "type": "draft",
            "source": 0,
            "color": "white",
            "row": 3
          },
          {
            "type": "draft",
            "source": 0,
            "color": "white",
            "row": 4
          },
          {
            "type": "draft",
            "source": 0,
            "color": "white",
            "row": -1
          },
          {
            "type": "draft",
            "source": 1,
            "color": "blue",
            "row": 0
          },
          {
            "type": "draft",
            "source": 1,
            "color": "blue",
            "row": 1
          },
          {
            "type": "draft",
            "source": 1,
            "color": "blue",
            "row": 2
          },
          {
            "type": "draft",
            "source": 1,
            "color": "blue",
            "row": 3
          },
          {
            "type": "draft",
            "source": 1,
            "color": "blue",
            "row": 4
          },
          {
            "type": "draft",
            "source": 1,
            "color": "blue",
            "row": -1
          },
          {
            "type": "draft",
            "source": 1,
            "color": "red",
            "row": 0
          },
          {
            "type": "draft",
            "source": 1,
            "color": "red",
            "row": 1
          },
          {
            "type": "draft",
            "source": 1,
            "color": "red",
            "row": 2
          },
          {
            "type": "draft",
            "source": 1,
            "color": "red",
            "row": 3
          },
          {
            "type": "draft",
            "source": 1,
            "color": "red",
            "row": 4
          },
          {
            "type": "draft",
            "source": 1,
            "color": "red",
            "row": -1
          },
          {
            "type": "draft",
            "source": 1,
            "color": "yellow",
            "row": 0
          },
          {
            "type": "draft",
            "source": 1,
            "color": "yellow",
            "row": 1
          },
          {
            "type": "draft",
            "source": 1,
            "color": "yellow",
            "row": 2
          },
          {
            "type": "draft",
            "source": 1,
            "color": "yellow",
            "row": 3
          },
          {
            "type": "draft",
            "source": 1,
            "color": "yellow",
            "row": 4
          },
          {
            "type": "draft",
            "source": 1,
            "color": "yellow",
            "row": -1
          },
          {
            "type": "draft",
            "source": 1,
            "color": "black",
            "row": 0
          },
          {
            "type": "draft",
            "source": 1,
            "color": "black",
            "row": 1
          },
          {
            "type": "draft",
            "source": 1,
            "color": "black",
            "row": 2
          },
          {
            "type": "draft",
            "source": 1,
            "color": "black",
            "row": 3
          },
          {
            "type": "draft",
            "source": 1,
            "color": "black",
            "row": 4
          },
          {
            "type": "draft",
            "source": 1,
            "color": "black",
            "row": -1
          },
          {
            "type": "draft",
            "source": 2,
            "color": "white",
            "row": 0
          },
          {
            "type": "draft",
            "source": 2,
            "color": "white",
            "row": 1
          },
          {
            "type": "draft",
            "source": 2,
            "color": "white",
            "row": 2
          },
          {
            "type": "draft",
            "source": 2,
            "color": "white",
            "row": 3
          },
          {
            "type": "draft",
            "source": 2,
            "color": "white",
            "row": 4
          },
          {
            "type": "draft",
            "source": 2,
            "color": "white",
            "row": -1
          },
          {
            "type": "draft",
            "source": 2,
            "color": "red",
            "row": 0
          },
          {
            "type": "draft",
            "source": 2,
            "color": "red",
            "row": 1
          },
          {
            "type": "draft",
            "source": 2,
            "color": "red",
            "row": 2
          },
          {
            "type": "draft",
            "source": 2,
            "color": "red",
            "row": 3
          },
          {
            "type": "draft",
            "source": 2,
            "color": "red",
            "row": 4
          },
          {
            "type": "draft",
            "source": 2,
            "color": "red",
            "row": -1
          },
          {
            "type": "draft",
            "source": 2,
            "color": "yellow",
            "row": 0
          },
          {
            "type": "draft",
            "source": 2,
            "color": "yellow",
            "row": 1
          },
          {
            "type": "draft",
            "source": 2,
            "color": "yellow",
            "row": 2
          },
          {
            "type": "draft",
            "source": 2,
            "color": "yellow",
            "row": 3
          },
          {
            "type": "draft",
            "source": 2,
            "color": "yellow",
            "row": 4
          },
          {
            "type": "draft",
            "source": 2,
            "color": "yellow",
            "row": -1
          },
          {
            "type": "draft",
            "source": 3,
            "color": "black",
            "row": 0
          },
          {
            "type": "draft",
            "source": 3,
            "color": "black",
            "row": 1
          },
          {
            "type": "draft",
            "source": 3,
            "color": "black",
            "row": 2
          },
          {
            "type": "draft",
            "source": 3,
            "color": "black",
            "row": 3
          },
          {
            "type": "draft",
            "source": 3,
            "color": "black",
            "row": 4
          },
          {
            "type": "draft",
            "source": 3,
            "color": "black",
            "row": -1
          },
          {
            "type": "draft",
            "source": 3,
            "color": "yellow",
            "row": 0
          },
          {
            "type": "draft",
            "source": 3,
            "color": "yellow",
            "row": 1
          },
          {
            "type": "draft",
            "source": 3,
            "color": "yellow",
            "row": 2
          },
          {
            "type": "draft",
            "source": 3,
            "color": "yellow",
            "row": 3
          },
          {
            "type": "draft",
            "source": 3,
            "color": "yellow",
            "row": 4
          },
          {
            "type": "draft",
            "source": 3,
            "color": "yellow",
            "row": -1
          },
          {
            "type": "draft",
            "source": 3,
            "color": "blue",
            "row": 0
          },
          {
            "type": "draft",
            "source": 3,
            "color": "blue",
            "row": 1
          },
          {
            "type": "draft",
            "source": 3,
            "color": "blue",
            "row": 2
          },
          {
            "type": "draft",
            "source": 3,
            "color": "blue",
            "row": 3
          },
          {
            "type": "draft",
            "source": 3,
            "color": "blue",
            "row": 4
          },
          {
            "type": "draft",
            "source": 3,
            "color": "blue",
            "row": -1
          },
          {
            "type": "draft",
            "source": 3,
            "color": "red",
            "row": 0
          },
          {
            "type": "draft",
            "source": 3,
            "color": "red",
            "row": 1
          },
          {
            "type": "draft",
            "source": 3,
            "color": "red",
            "row": 2
          },
          {
            "type": "draft",
            "source": 3,
            "color": "red",
            "row": 3
          },
          {
            "type": "draft",
            "source": 3,
            "color": "red",
            "row": 4
          },
          {
            "type": "draft",
            "source": 3,
            "color": "red",
            "row": -1
          },
          {
            "type": "draft",
            "source": 4,
            "color": "black",
            "row": 0
          },
          {
            "type": "draft",
            "source": 4,
            "color": "black",
            "row": 1
          },
          {
            "type": "draft",
            "source": 4,
            "color": "black",
            "row": 2
          },
          {
            "type": "draft",
            "source": 4,
            "color": "black",
            "row": 3
          },
          {
            "type": "draft",
            "source": 4,
            "color": "black",
            "row": 4
          },
          {
            "type": "draft",
            "source": 4,
            "color": "black",
            "row": -1
          },
          {
            "type": "draft",
            "source": 4,
            "color": "blue",
            "row": 0
          },
          {
            "type": "draft",
            "source": 4,
            "color": "blue",
            "row": 1
          },
          {
            "type": "draft",
            "source": 4,
            "color": "blue",
            "row": 2
          },
          {
            "type": "draft",
            "source": 4,
            "color": "blue",
            "row": 3
          },
          {
            "type": "draft",
            "source": 4,
            "color": "blue",
            "row": 4
          },
          {
            "type": "draft",
            "source": 4,
            "color": "blue",
            "row": -1
          },
          {
            "type": "draft",
            "source": 4,
            "color": "red",
            "row": 0
          },
          {
            "type": "draft",
            "source": 4,
            "color": "red",
            "row": 1
          },
          {
            "type": "draft",
            "source": 4,
            "color": "red",
            "row": 2
          },
          {
            "type": "draft",
            "source": 4,
            "color": "red",
            "row": 3
          },
          {
            "type": "draft",
            "source": 4,
            "color": "red",
            "row": 4
          },
          {
            "type": "draft",
            "source": 4,
            "color": "red",
            "row": -1
          }
        ],
        "lastRound": [
          {
            "seatId": "tutorial.you",
            "kind": "floor",
            "row": -1,
            "col": -1,
            "color": null,
            "points": -6,
            "from": 1,
            "total": 0,
            "cells": [],
            "label": "地板扣分"
          }
        ]
      },
      "events": [
        {
          "type": "tiles.drafted",
          "seatId": "tutorial.you",
          "color": "red",
          "count": 1,
          "row": -1,
          "source": -1,
          "eventId": "tutorial.azul.floor.0"
        },
        {
          "type": "round.scored",
          "round": 1,
          "steps": [
            {
              "seatId": "tutorial.you",
              "kind": "floor",
              "row": -1,
              "col": -1,
              "color": null,
              "points": -6,
              "cells": [],
              "label": "地板扣分",
              "from": 1,
              "total": 0
            }
          ],
          "eventId": "tutorial.azul.floor.1"
        }
      ]
    },
    {
      "id": "finish",
      "initial": {
        "factories": [
          [
            "blue"
          ],
          [],
          [],
          [],
          []
        ],
        "bagCount": 79,
        "players": {
          "tutorial.you": {
            "score": 10,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                true,
                true,
                true,
                true
              ],
              [
                true,
                true,
                true,
                true,
                false
              ],
              [
                true,
                true,
                true,
                true,
                false
              ],
              [
                true,
                true,
                true,
                true,
                false
              ],
              [
                true,
                true,
                true,
                false,
                true
              ]
            ],
            "floor": []
          },
          "tutorial.opponent": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          }
        },
        "legalActions": [
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": 0
          },
          {
            "type": "draft",
            "source": 0,
            "color": "blue",
            "row": -1
          }
        ]
      },
      "action": {
        "type": "draft",
        "source": 0,
        "color": "blue",
        "row": 0
      },
      "changes": {
        "currentSeatId": "tutorial.opponent",
        "phase": "finished",
        "factories": [
          [],
          [],
          [],
          [],
          []
        ],
        "players": {
          "tutorial.you": {
            "score": 53,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                true,
                true,
                true,
                true,
                true
              ],
              [
                true,
                true,
                true,
                true,
                false
              ],
              [
                true,
                true,
                true,
                true,
                false
              ],
              [
                true,
                true,
                true,
                true,
                false
              ],
              [
                true,
                true,
                true,
                false,
                true
              ]
            ],
            "floor": []
          },
          "tutorial.opponent": {
            "score": 0,
            "lines": [
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              },
              {
                "color": null,
                "count": 0
              }
            ],
            "wall": [
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ],
              [
                false,
                false,
                false,
                false,
                false
              ]
            ],
            "floor": []
          }
        },
        "legalActions": [],
        "lastRound": [
          {
            "seatId": "tutorial.you",
            "kind": "tile",
            "row": 0,
            "col": 0,
            "color": "blue",
            "points": 10,
            "from": 10,
            "total": 20,
            "cells": [
              {
                "row": 0,
                "col": 0
              },
              {
                "row": 0,
                "col": 1
              },
              {
                "row": 0,
                "col": 2
              },
              {
                "row": 0,
                "col": 3
              },
              {
                "row": 0,
                "col": 4
              },
              {
                "row": 1,
                "col": 0
              },
              {
                "row": 2,
                "col": 0
              },
              {
                "row": 3,
                "col": 0
              },
              {
                "row": 4,
                "col": 0
              }
            ],
            "label": "交织连线"
          },
          {
            "seatId": "tutorial.you",
            "kind": "bonus",
            "row": -1,
            "col": -1,
            "color": null,
            "points": 2,
            "from": 20,
            "total": 22,
            "cells": [],
            "label": "完整横行 ×1"
          },
          {
            "seatId": "tutorial.you",
            "kind": "bonus",
            "row": -1,
            "col": -1,
            "color": null,
            "points": 21,
            "from": 22,
            "total": 43,
            "cells": [],
            "label": "完整竖列 ×3"
          },
          {
            "seatId": "tutorial.you",
            "kind": "bonus",
            "row": -1,
            "col": -1,
            "color": null,
            "points": 10,
            "from": 43,
            "total": 53,
            "cells": [],
            "label": "同色集齐 ×1"
          }
        ],
        "outcome": {
          "status": "finished",
          "scores": {
            "tutorial.you": 53,
            "tutorial.opponent": 0
          },
          "winners": [
            "tutorial.you"
          ]
        }
      },
      "events": [
        {
          "type": "tiles.drafted",
          "seatId": "tutorial.you",
          "color": "blue",
          "count": 1,
          "row": 0,
          "source": 0,
          "eventId": "tutorial.azul.finish.0"
        },
        {
          "type": "round.scored",
          "round": 1,
          "steps": [
            {
              "seatId": "tutorial.you",
              "kind": "tile",
              "row": 0,
              "col": 0,
              "color": "blue",
              "points": 10,
              "cells": [
                {
                  "row": 0,
                  "col": 0
                },
                {
                  "row": 0,
                  "col": 1
                },
                {
                  "row": 0,
                  "col": 2
                },
                {
                  "row": 0,
                  "col": 3
                },
                {
                  "row": 0,
                  "col": 4
                },
                {
                  "row": 1,
                  "col": 0
                },
                {
                  "row": 2,
                  "col": 0
                },
                {
                  "row": 3,
                  "col": 0
                },
                {
                  "row": 4,
                  "col": 0
                }
              ],
              "label": "交织连线",
              "from": 10,
              "total": 20
            },
            {
              "seatId": "tutorial.you",
              "kind": "bonus",
              "row": -1,
              "col": -1,
              "color": null,
              "points": 2,
              "cells": [],
              "label": "完整横行 ×1",
              "from": 20,
              "total": 22
            },
            {
              "seatId": "tutorial.you",
              "kind": "bonus",
              "row": -1,
              "col": -1,
              "color": null,
              "points": 21,
              "cells": [],
              "label": "完整竖列 ×3",
              "from": 22,
              "total": 43
            },
            {
              "seatId": "tutorial.you",
              "kind": "bonus",
              "row": -1,
              "col": -1,
              "color": null,
              "points": 10,
              "cells": [],
              "label": "同色集齐 ×1",
              "from": 43,
              "total": 53
            }
          ],
          "eventId": "tutorial.azul.finish.1"
        },
        {
          "type": "match.finished",
          "winners": [
            "tutorial.you"
          ],
          "eventId": "tutorial.azul.finish.2"
        }
      ]
    }
  ]
};
