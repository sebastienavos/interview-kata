type Direction = "N" | "S" | "E" | "W";

interface Position {
  x: number;
  y: number;
}

const DIRECTIONS: Direction[] = ["N", "E", "S", "W"];

function getDirectionIndex(dir: Direction): number {
  return DIRECTIONS.indexOf(dir);
}

function turnLeft(dir: Direction): Direction {
  const index = getDirectionIndex(dir);
  return DIRECTIONS[(index - 1 + 4) % 4];
}

function turnRight(dir: Direction): Direction {
  const index = getDirectionIndex(dir);
  return DIRECTIONS[(index + 1) % 4];
}

function getMovementVector(dir: Direction): [number, number] {
  switch (dir) {
    case "N":
      return [0, 1];
    case "S":
      return [0, -1];
    case "E":
      return [1, 0];
    case "W":
      return [-1, 0];
  }
}

export class Rover {
  private position: Position;
  private direction: Direction;
  private blocked = false;

  constructor(x: number, y: number, direction: Direction) {
    this.position = { x, y };
    this.direction = direction;
  }

  getPosition(): Position {
    return { ...this.position };
  }

  getDirection(): Direction {
    return this.direction;
  }

  isBlocked(): boolean {
    return this.blocked;
  }

  turnLeft(): void {
    this.direction = turnLeft(this.direction);
  }

  turnRight(): void {
    this.direction = turnRight(this.direction);
  }

  moveForward(plateau: Plateau): void {
    const [dx, dy] = getMovementVector(this.direction);
    const newX = this.position.x + dx;
    const newY = this.position.y + dy;

    if (!plateau.isWithinBounds(newX, newY)) return;
    if (plateau.hasObstacle(newX, newY)) {
      this.blocked = true;
      return;
    }

    this.position.x = newX;
    this.position.y = newY;
  }

  // Hitting an obstacle aborts the rest of the sequence; the rover stays on its last good square.
  executeCommands(commands: string, plateau: Plateau): void {
    this.blocked = false;
    for (const command of commands) {
      if (this.blocked) break;
      if (command === "L") {
        this.turnLeft();
      } else if (command === "R") {
        this.turnRight();
      } else if (command === "M") {
        this.moveForward(plateau);
      }
    }
  }

  toString(): string {
    const status = this.blocked ? " O" : "";
    return `${this.position.x} ${this.position.y} ${this.direction}${status}`;
  }
}

export class Plateau {
  private maxX: number;
  private maxY: number;
  private obstacles: Set<string>;

  constructor(maxX: number, maxY: number, obstacles: Position[] = []) {
    this.maxX = maxX;
    this.maxY = maxY;
    this.obstacles = new Set(obstacles.map(({ x, y }) => `${x},${y}`));
  }

  isWithinBounds(x: number, y: number): boolean {
    return x >= 0 && x <= this.maxX && y >= 0 && y <= this.maxY;
  }

  hasObstacle(x: number, y: number): boolean {
    return this.obstacles.has(`${x},${y}`);
  }

  getMaxX(): number {
    return this.maxX;
  }

  getMaxY(): number {
    return this.maxY;
  }
}

export class MarsRoverMission {
  private plateau: Plateau;
  private rovers: Rover[] = [];

  constructor(maxX: number, maxY: number, obstacles: Position[] = []) {
    this.plateau = new Plateau(maxX, maxY, obstacles);
  }

  addRover(rover: Rover): void {
    this.rovers.push(rover);
  }

  executeRoverCommands(roverIndex: number, commands: string): void {
    if (roverIndex >= 0 && roverIndex < this.rovers.length) {
      this.rovers[roverIndex].executeCommands(commands, this.plateau);
    }
  }

  getRoverPositions(): string[] {
    return this.rovers.map((rover) => rover.toString());
  }

  getRoverOutput(): string {
    return this.getRoverPositions().join("\n");
  }

  static parseInput(input: string): MarsRoverMission {
    const lines = input.trim().split("\n");

    const plateauMatch = lines[0].match(/^(\d+)\s+(\d+)$/);
    if (!plateauMatch) throw new Error(`Invalid plateau: "${lines[0]}"`);
    const maxX = Number(plateauMatch[1]);
    const maxY = Number(plateauMatch[2]);

    // Optional obstacle lines ("O x y") sit between the plateau and the first rover.
    const obstacles: Position[] = [];
    let first = 1;
    for (; first < lines.length && lines[first].startsWith("O"); first++) {
      const obstacleMatch = lines[first].match(/^O\s+(\d+)\s+(\d+)$/);
      if (!obstacleMatch) throw new Error(`Invalid obstacle: "${lines[first]}"`);
      const x = Number(obstacleMatch[1]);
      const y = Number(obstacleMatch[2]);
      if (x > maxX || y > maxY) throw new Error(`Obstacle outside plateau: "${lines[first]}"`);
      obstacles.push({ x, y });
    }

    if ((lines.length - first) % 2 !== 0) {
      throw new Error("Each rover needs a position line and a commands line");
    }

    const mission = new MarsRoverMission(maxX, maxY, obstacles);

    for (let i = first; i < lines.length; i += 2) {
      const positionMatch = lines[i].match(/^(\d+)\s+(\d+)\s+([NESW])$/);
      if (!positionMatch) throw new Error(`Invalid rover position: "${lines[i]}"`);
      const x = Number(positionMatch[1]);
      const y = Number(positionMatch[2]);
      const direction = positionMatch[3] as Direction;
      if (!mission.plateau.isWithinBounds(x, y)) {
        throw new Error(`Rover position outside plateau: "${lines[i]}"`);
      }
      if (mission.plateau.hasObstacle(x, y)) {
        throw new Error(`Rover position on obstacle: "${lines[i]}"`);
      }

      const rover = new Rover(x, y, direction);
      mission.addRover(rover);

      const commands = lines[i + 1];
      if (!/^[LRM]*$/.test(commands)) throw new Error(`Invalid commands: "${commands}"`);
      mission.executeRoverCommands(mission.rovers.length - 1, commands);
    }

    return mission;
  }
}
