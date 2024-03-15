const mysql = require("mysql2");
const inquirer = require("inquirer");

const db = mysql.createConnection(
  {
    host: "localhost",
    user: "root",
    password: "",
    database: "employees_db",
  },
  console.log(`Connected to the employees database.`)
);

function main() {
  inquirer
    .prompt([
      {
        name: "action",
        type: "list",
        message: "What would you like to do?",
        choices: [
          "View all Departments",
          "View all Roles",
          "View all Employees",
          "Add a Department",
          "Add a Role",
          "Add an Employee",
          "Update an Employee Role",
          "Quit",
        ],
        loop: false,
      },
    ])
    .then((answers) => {
      let fn = null;
      switch (answers.action) {
        case "View all Departments":
          fn = viewDepartments;
          break;
        case "View all Roles":
          fn = viewRoles;
          break;
        case "View all Employees":
          fn = viewEmployees;
          break;
        case "Add a Department":
          fn = addDepartment;
          break;
        case "Add a Role":
          fn = addRole;
          break;
        case "Add an Employee":
          fn = addEmployee;
          break;
        case "Update an Employee Role":
          fn = updateEmployeeRole;
          break;
        case "Quit":
          console.log("Program terminated");
          process.exit();
        default:
          console.log("Invalid action");
          main();
      }

      handleResponse(fn);
    });
}

async function handleResponse(fn) {
  try {
    const result = await fn();

    if (Array.isArray(result)) {
      console.table(result);
    } else {
      console.log(result);
    }
  } catch (err) {
    console.log(err);
  }

  returnOrQuit();
}

function returnOrQuit() {
  inquirer
    .prompt([
      {
        name: "action",
        type: "list",
        message:
          "Would you like to return to the main menu or quit the program?",
        choices: ["Return", "Quit"],
      },
    ])
    .then((answers) => {
      if (answers.action === "Return") {
        main();
      } else {
        console.log("Program terminated");
        process.exit();
      }
    });
}

async function viewDepartments() {
  const query = "SELECT * FROM department";
  return new Promise((resolve, reject) => {
    db.query(query, function (err, results) {
      if (err) {
        reject(err);
      }

      resolve(results);
    });
  });
}

async function viewRoles() {
  const query =
    "SELECT role.id, role.title, role.salary, department.name as department FROM role JOIN department ON role.department_id = department.id";
  return new Promise((resolve, reject) => {
    db.query(query, function (err, results) {
      if (err) {
        reject(err);
      }

      resolve(results);
    });
  });
}

async function viewEmployees() {
  const query =
    "SELECT employee.id, employee.first_name, employee.last_name, role.title, department.name as department, role.salary, CONCAT(COALESCE(manager.first_name), ' ', COALESCE(manager.last_name)) as manager_name FROM employee JOIN role ON employee.role_id = role.id LEFT JOIN employee manager ON employee.manager_id = manager.id LEFT JOIN department ON role.department_id = department.id";
  return new Promise((resolve, reject) => {
    db.query(query, function (err, results) {
      if (err) {
        reject(err);
      }

      resolve(results);
    });
  });
}

async function addDepartment() {
  const result = await inquirer
    .prompt([
      {
        name: "department",
        type: "input",
        message: "What is the name of the department?",
      },
    ])
    .then((answers) => {
      const query = "INSERT INTO department (name) VALUES (?)";
      return new Promise((resolve, reject) => {
        db.query(query, [answers.department], function (err, results) {
          if (err) {
            reject(err);
          }

          resolve(`[${answers.department}] Department added`);
        });
      });
    });

  return result;
}

async function addRole() {
  const departments = await viewDepartments();
  const result = await inquirer
    .prompt([
      {
        name: "title",
        type: "input",
        message: "What is the title of the role?",
      },
      {
        name: "salary",
        type: "input",
        message: "What is the salary of the role?",
      },
      {
        name: "department",
        type: "list",
        message: "Which department does the role belong to?",
        choices: departments.map((department) => department.name),
      },
    ])
    .then((answers) => {
      const query =
        "INSERT INTO role (title, salary, department_id) VALUES (?, ?, (SELECT id FROM department WHERE name = ?))";
      return new Promise((resolve, reject) => {
        db.query(
          query,
          [answers.title, answers.salary, answers.department],
          function (err, results) {
            if (err) {
              reject(err);
            }

            resolve(`[${answers.title}] Role added`);
          }
        );
      });
    });

  return result;
}

async function addEmployee() {
  const roles = await viewRoles();
  const employees = await viewEmployees();
  const result = await inquirer
    .prompt([
      {
        name: "first_name",
        type: "input",
        message: "What is the first name of the employee?",
      },
      {
        name: "last_name",
        type: "input",
        message: "What is the last name of the employee?",
      },
      {
        name: "role",
        type: "list",
        message: "What is the role of the employee?",
        choices: roles.map((role) => role.title),
      },
      {
        name: "manager",
        type: "list",
        message: "Who is the manager of the employee?",
        choices: [
          "None",
          ...employees.map(
            (employee) =>
              `${employee.id} ${employee.first_name} ${employee.last_name}`
          ),
        ],
      },
    ])
    .then((answers) => {
      const manager =
        answers.manager === "None" ? null : answers.manager.split(" ")[0];
      const query =
        "INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES (?, ?, (SELECT id FROM role WHERE title = ?), ?)";
      return new Promise((resolve, reject) => {
        db.query(
          query,
          [answers.first_name, answers.last_name, answers.role, manager],
          function (err, results) {
            if (err) {
              reject(err);
            }

            resolve(
              `[${answers.first_name} ${answers.last_name}] Employee added`
            );
          }
        );
      });
    });

  return result;
}

async function updateEmployeeRole() {
  const employees = await viewEmployees();
  const roles = await viewRoles();
  const result = await inquirer
    .prompt([
      {
        name: "employee",
        type: "list",
        message: "Which employee's role do you want to update?",
        choices: employees.map(
          (employee) =>
            `${employee.id} ${employee.first_name} ${employee.last_name}`
        ),
      },
      {
        name: "role",
        type: "list",
        message: "What is the new role of the employee?",
        choices: roles.map((role) => role.title),
      },
    ])
    .then((answers) => {
      const query =
        "UPDATE employee SET role_id = (SELECT id FROM role WHERE title = ?) WHERE id = ?";
      return new Promise((resolve, reject) => {
        db.query(
          query,
          [answers.role, answers.employee.split(" ")[0]],
          function (err, results) {
            if (err) {
              reject(err);
            }

            resolve(
              `[${answers.first_name} ${answers.last_name}] Employee role update`
            );
          }
        );
      });
    });

  return result;
}

main();
