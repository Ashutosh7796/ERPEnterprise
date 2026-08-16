# ERP System - Enterprise Resource Planning System

# Project Overview
* **ERP System** is an Enterprise Resource Planning (ERP) system designed for small and medium-sized enterprises (SMEs) to streamline inventory management, sales, purchasing, financials, and production.
---

# Core Features
- **Retail Management**: POS, cash registers, member sales, and receipt processing.
- **Purchase Management**: Purchase requisitions, purchase orders, stocking, returns, and supplier payments.
- **Sales Management**: Customer orders, outbound sales, returns, and customer collection accounts.
- **Warehouse & Inventory**: Stock transfer, stock check, inventory adjustments, and multi-warehouse support.
- **Financial Management**: Income/expense items, transfer accounts, accounts receivable, accounts payable, and financial ledgers.
- **Reports & Analytics**: Sales reports, purchase reports, stock warnings, and profit analysis.
- **Material Management**: Multi-unit management, barcodes, categories, and serial/batch tracking.
- **System Administration**: User permissions, role management, tenant isolation, department trees, and system logs.

---

# Technology Stack

## Backend (`jshERP-boot`)
* **Core Framework**: Spring Boot 2.0.0
* **ORM & Persistence**: MyBatis 1.3.2 / MyBatis-Plus
* **Database**: MySQL 8.0+
* **Cache**: Redis 6.2+
* **Logging**: SLF4J 1.7
* **Build System**: Apache Maven 3.3+

## Frontend (`jshERP-web`)
* **UI Framework**: Vue 2.7.16
* **Component Library**: Ant Design Vue 1.5.2
* **State & Router**: Vuex, Vue Router

---

# Recommended Development Environment
* **IDE**: IntelliJ IDEA / VS Code
* **JDK**: OpenJDK / Oracle JDK 1.8
* **Node.js**: Node.js 16.x / 18.x / 20.x
* **Database**: MySQL 8.0.24
* **Redis**: Redis 6.2.1
* **Maven**: Maven 3.3.9+

---

# Quick Start Guide

### 1. Database Setup
1. Create a MySQL database named `jsh_erp`.
2. Import the schema and seed data from [jsh_erp.sql](file:///e:/Codes/ERP/jshERP-master/jshERP-boot/docs/jsh_erp.sql):
   ```bash
   mysql -u root -p jsh_erp < jshERP-boot/docs/jsh_erp.sql
   ```

### 2. Backend Launch (`jshERP-boot`)
1. Configure database credentials in [application.yml](file:///e:/Codes/ERP/jshERP-master/jshERP-boot/src/main/resources/application.yml).
2. Start `ErpApplication.java`.
3. Backend service will be available at: `http://localhost:9999/jshERP-boot`
4. Swagger API Documentation: `http://localhost:9999/jshERP-boot/doc.html`

### 3. Frontend Launch (`jshERP-web`)
1. Navigate to the frontend directory:
   ```bash
   cd jshERP-web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run serve
   ```
4. Access in web browser: **`http://localhost:3000`**

### 4. Default Login Credentials
* **Default Tenant**: `jsh`
* **Default Super Admin**: `admin`
* **Default Password**: `123456`

---

# License
This project is property of tesseract infosystems licensed under the **Apache-2.0** License.