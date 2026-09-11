import { TableData, RelationshipData } from '../types/schema';

export interface PresetSchema {
  id: string;
  name: string;
  description: string;
  tables: TableData[];
  relations: RelationshipData[];
}

export const PRESET_SCHEMAS: PresetSchema[] = [
  {
    id: 'ecommerce',
    name: 'E-Commerce Store',
    description: 'Complete e-commerce schema with users, products, categories, orders, order items, and reviews.',
    tables: [
      {
        id: 'tbl-users',
        name: 'users',
        colorTag: '#38bdf8',
        comment: 'Registered customer accounts and authentication info',
        columns: [
          { id: 'col-u1', name: 'id', type: 'UUID', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: false, defaultValue: 'gen_random_uuid()' },
          { id: 'col-u2', name: 'email', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: 'col-u3', name: 'password_hash', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-u4', name: 'full_name', type: 'VARCHAR(100)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-u5', name: 'is_active', type: 'BOOLEAN', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: 'true' },
          { id: 'col-u6', name: 'created_at', type: 'TIMESTAMPTZ', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: 'NOW()' },
        ]
      },
      {
        id: 'tbl-categories',
        name: 'categories',
        colorTag: '#10b981',
        comment: 'Hierarchical product category taxonomy',
        columns: [
          { id: 'col-c1', name: 'id', type: 'SERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-c2', name: 'name', type: 'VARCHAR(100)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-c3', name: 'slug', type: 'VARCHAR(100)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: 'col-c4', name: 'parent_id', type: 'INT', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
        ]
      },
      {
        id: 'tbl-products',
        name: 'products',
        colorTag: '#6366f1',
        comment: 'Catalog items with pricing and inventory status',
        columns: [
          { id: 'col-p1', name: 'id', type: 'UUID', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: false, defaultValue: 'gen_random_uuid()' },
          { id: 'col-p2', name: 'category_id', type: 'INT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-p3', name: 'title', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-p4', name: 'sku', type: 'VARCHAR(50)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: 'col-p5', name: 'price', type: 'DECIMAL(10,2)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-p6', name: 'stock_quantity', type: 'INT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: '0' },
          { id: 'col-p7', name: 'created_at', type: 'TIMESTAMPTZ', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: 'NOW()' },
        ]
      },
      {
        id: 'tbl-orders',
        name: 'orders',
        colorTag: '#f59e0b',
        comment: 'Customer purchase orders and fulfillment status',
        columns: [
          { id: 'col-o1', name: 'id', type: 'UUID', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: false, defaultValue: 'gen_random_uuid()' },
          { id: 'col-o2', name: 'user_id', type: 'UUID', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-o3', name: 'status', type: 'VARCHAR(50)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: "'pending'" },
          { id: 'col-o4', name: 'total_amount', type: 'DECIMAL(10,2)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-o5', name: 'shipping_address', type: 'TEXT', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-o6', name: 'created_at', type: 'TIMESTAMPTZ', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: 'NOW()' },
        ]
      },
      {
        id: 'tbl-order-items',
        name: 'order_items',
        colorTag: '#f43f5e',
        comment: 'Line items linking products to specific orders',
        columns: [
          { id: 'col-oi1', name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-oi2', name: 'order_id', type: 'UUID', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-oi3', name: 'product_id', type: 'UUID', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-oi4', name: 'quantity', type: 'INT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: '1' },
          { id: 'col-oi5', name: 'unit_price', type: 'DECIMAL(10,2)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
        ]
      }
    ],
    relations: [
      {
        id: 'rel-1',
        sourceTableId: 'tbl-products',
        sourceColumnId: 'col-p2',
        targetTableId: 'tbl-categories',
        targetColumnId: 'col-c1',
        name: 'fk_products_categories',
        cardinality: '1:N',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      {
        id: 'rel-2',
        sourceTableId: 'tbl-orders',
        sourceColumnId: 'col-o2',
        targetTableId: 'tbl-users',
        targetColumnId: 'col-u1',
        name: 'fk_orders_users',
        cardinality: '1:N',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      {
        id: 'rel-3',
        sourceTableId: 'tbl-order-items',
        sourceColumnId: 'col-oi2',
        targetTableId: 'tbl-orders',
        targetColumnId: 'col-o1',
        name: 'fk_order_items_orders',
        cardinality: '1:N',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      {
        id: 'rel-4',
        sourceTableId: 'tbl-order-items',
        sourceColumnId: 'col-oi3',
        targetTableId: 'tbl-products',
        targetColumnId: 'col-p1',
        name: 'fk_order_items_products',
        cardinality: '1:N',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    ]
  },
  {
    id: 'rbac-auth',
    name: 'RBAC Authentication & Permissions',
    description: 'Role-based access control with users, roles, permissions, and session tokens.',
    tables: [
      {
        id: 'tbl-users',
        name: 'users',
        colorTag: '#38bdf8',
        columns: [
          { id: 'col-u1', name: 'id', type: 'UUID', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: 'col-u2', name: 'username', type: 'VARCHAR(50)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: 'col-u3', name: 'email', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: 'col-u4', name: 'created_at', type: 'TIMESTAMPTZ', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
        ]
      },
      {
        id: 'tbl-roles',
        name: 'roles',
        colorTag: '#10b981',
        columns: [
          { id: 'col-r1', name: 'id', type: 'SERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-r2', name: 'name', type: 'VARCHAR(50)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: 'col-r3', name: 'description', type: 'TEXT', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
        ]
      },
      {
        id: 'tbl-user-roles',
        name: 'user_roles',
        colorTag: '#6366f1',
        columns: [
          { id: 'col-ur1', name: 'user_id', type: 'UUID', isPrimary: true, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-ur2', name: 'role_id', type: 'INT', isPrimary: true, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-ur3', name: 'assigned_at', type: 'TIMESTAMPTZ', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
        ]
      },
      {
        id: 'tbl-permissions',
        name: 'permissions',
        colorTag: '#f59e0b',
        columns: [
          { id: 'col-pm1', name: 'id', type: 'SERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-pm2', name: 'code', type: 'VARCHAR(100)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: 'col-pm3', name: 'description', type: 'TEXT', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
        ]
      },
      {
        id: 'tbl-role-permissions',
        name: 'role_permissions',
        colorTag: '#f43f5e',
        columns: [
          { id: 'col-rp1', name: 'role_id', type: 'INT', isPrimary: true, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-rp2', name: 'permission_id', type: 'INT', isPrimary: true, isNullable: false, isUnique: false, isAutoIncrement: false },
        ]
      }
    ],
    relations: [
      {
        id: 'rel-ur-u',
        sourceTableId: 'tbl-user-roles',
        sourceColumnId: 'col-ur1',
        targetTableId: 'tbl-users',
        targetColumnId: 'col-u1',
        cardinality: '1:N',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      {
        id: 'rel-ur-r',
        sourceTableId: 'tbl-user-roles',
        sourceColumnId: 'col-ur2',
        targetTableId: 'tbl-roles',
        targetColumnId: 'col-r1',
        cardinality: '1:N',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      {
        id: 'rel-rp-r',
        sourceTableId: 'tbl-role-permissions',
        sourceColumnId: 'col-rp1',
        targetTableId: 'tbl-roles',
        targetColumnId: 'col-r1',
        cardinality: '1:N',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      {
        id: 'rel-rp-p',
        sourceTableId: 'tbl-role-permissions',
        sourceColumnId: 'col-rp2',
        targetTableId: 'tbl-permissions',
        targetColumnId: 'col-pm1',
        cardinality: '1:N',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      }
    ]
  },
  {
    id: 'portfolio-v2',
    name: 'Fahmi Ibrahim Portfolio CMS',
    description: 'Complete architecture for Developer Portfolio & CMS with Profile, Timeline, Tech Skills, Projects (BOM, Files, Media), Articles, and Credentials.',
    tables: [
      {
        id: 'tbl-profile-settings',
        name: 'profile_settings',
        colorTag: '#38bdf8',
        comment: 'Core developer profile, hero headline, bio, contact and social links',
        columns: [
          { id: 'col-ps-1', name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-ps-2', name: 'full_name', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-ps-3', name: 'hero_title', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-ps-4', name: 'hero_subtitle', type: 'TEXT', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-ps-5', name: 'bio_markdown', type: 'TEXT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-ps-6', name: 'avatar_url', type: 'VARCHAR(255)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-ps-7', name: 'resume_url', type: 'VARCHAR(255)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-ps-8', name: 'github_url', type: 'VARCHAR(255)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-ps-9', name: 'linkedin_url', type: 'VARCHAR(255)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-ps-10', name: 'created_at', type: 'TIMESTAMPTZ', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: 'NOW()' },
        ]
      },
      {
        id: 'tbl-work-experiences',
        name: 'work_experiences',
        colorTag: '#0ea5e9',
        comment: 'Career timeline history and professional work deliverables',
        columns: [
          { id: 'col-we-1', name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-we-2', name: 'company_name', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-we-3', name: 'role_title', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-we-4', name: 'employment_type', type: 'VARCHAR(50)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-we-5', name: 'location', type: 'VARCHAR(100)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-we-6', name: 'start_date', type: 'DATE', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-we-7', name: 'end_date', type: 'DATE', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-we-8', name: 'is_current', type: 'BOOLEAN', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: 'false' },
          { id: 'col-we-9', name: 'description', type: 'TEXT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-we-10', name: 'technologies', type: 'TEXT', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
        ]
      },
      {
        id: 'tbl-university-achievements',
        name: 'university_achievements',
        colorTag: '#06b6d4',
        comment: 'Academic education, GPA, and university competition achievements',
        columns: [
          { id: 'col-ua-1', name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-ua-2', name: 'institution', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-ua-3', name: 'degree', type: 'VARCHAR(100)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-ua-4', name: 'field_of_study', type: 'VARCHAR(150)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-ua-5', name: 'gpa', type: 'DECIMAL(3,2)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-ua-6', name: 'start_year', type: 'INT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-ua-7', name: 'end_year', type: 'INT', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-ua-8', name: 'achievements_text', type: 'TEXT', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
        ]
      },
      {
        id: 'tbl-tech-categories',
        name: 'tech_categories',
        colorTag: '#10b981',
        comment: 'Categorization groups for technical skills and toolsets',
        columns: [
          { id: 'col-tc-1', name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-tc-2', name: 'category_name', type: 'VARCHAR(100)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: 'col-tc-3', name: 'icon_name', type: 'VARCHAR(50)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-tc-4', name: 'sort_order', type: 'INT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: '0' },
        ]
      },
      {
        id: 'tbl-tech-skills',
        name: 'tech_skills',
        colorTag: '#10b981',
        comment: 'Individual technical skills with proficiency level and badges',
        columns: [
          { id: 'col-ts-1', name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-ts-2', name: 'category_id', type: 'BIGINT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-ts-3', name: 'name', type: 'VARCHAR(100)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-ts-4', name: 'proficiency_level', type: 'VARCHAR(50)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-ts-5', name: 'icon_svg', type: 'VARCHAR(255)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-ts-6', name: 'is_featured', type: 'BOOLEAN', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: 'false' },
        ]
      },
      {
        id: 'tbl-project-categories',
        name: 'project_categories',
        colorTag: '#6366f1',
        comment: 'Taxonomy for projects (Web Apps, Embedded Systems, PCB Design)',
        columns: [
          { id: 'col-pc-1', name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-pc-2', name: 'name', type: 'VARCHAR(100)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: 'col-pc-3', name: 'slug', type: 'VARCHAR(100)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
        ]
      },
      {
        id: 'tbl-projects',
        name: 'projects',
        colorTag: '#6366f1',
        comment: 'Main portfolio showcase projects across software and hardware',
        columns: [
          { id: 'col-pr-1', name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-pr-2', name: 'category_id', type: 'BIGINT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-pr-3', name: 'title', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-pr-4', name: 'slug', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: 'col-pr-5', name: 'summary', type: 'TEXT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-pr-6', name: 'thumbnail_url', type: 'VARCHAR(255)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-pr-7', name: 'live_demo_url', type: 'VARCHAR(255)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-pr-8', name: 'github_url', type: 'VARCHAR(255)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-pr-9', name: 'is_featured', type: 'BOOLEAN', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: 'false' },
          { id: 'col-pr-10', name: 'created_at', type: 'TIMESTAMPTZ', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: 'NOW()' },
        ]
      },
      {
        id: 'tbl-project-details',
        name: 'project_details',
        colorTag: '#6366f1',
        comment: 'In-depth markdown content and architecture breakdown per project',
        columns: [
          { id: 'col-pd-1', name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-pd-2', name: 'project_id', type: 'BIGINT', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: 'col-pd-3', name: 'content_markdown', type: 'LONGTEXT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-pd-4', name: 'architecture_notes', type: 'TEXT', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-pd-5', name: 'challenges_solutions', type: 'TEXT', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
        ]
      },
      {
        id: 'tbl-project-images',
        name: 'project_images',
        colorTag: '#6366f1',
        comment: 'Gallery screenshots and schematics for projects',
        columns: [
          { id: 'col-pi-1', name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-pi-2', name: 'project_id', type: 'BIGINT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-pi-3', name: 'image_url', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-pi-4', name: 'caption', type: 'VARCHAR(255)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
        ]
      },
      {
        id: 'tbl-project-tags',
        name: 'project_tags',
        colorTag: '#6366f1',
        comment: 'Technology and stack keywords mapped to projects',
        columns: [
          { id: 'col-pt-1', name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-pt-2', name: 'project_id', type: 'BIGINT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-pt-3', name: 'tag_name', type: 'VARCHAR(50)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
        ]
      },
      {
        id: 'tbl-project-boms',
        name: 'project_boms',
        colorTag: '#8b5cf6',
        comment: 'Bill of Materials (BOM) for hardware, IoT, and PCB projects',
        columns: [
          { id: 'col-pb-1', name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-pb-2', name: 'project_id', type: 'BIGINT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-pb-3', name: 'component_name', type: 'VARCHAR(150)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-pb-4', name: 'quantity', type: 'INT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: '1' },
          { id: 'col-pb-5', name: 'specification', type: 'VARCHAR(255)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-pb-6', name: 'datasheet_url', type: 'VARCHAR(255)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
        ]
      },
      {
        id: 'tbl-article-categories',
        name: 'article_categories',
        colorTag: '#f59e0b',
        comment: 'High-level knowledge categories for technical articles',
        columns: [
          { id: 'col-ac-1', name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-ac-2', name: 'category_name', type: 'VARCHAR(100)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
        ]
      },
      {
        id: 'tbl-article-sub-categories',
        name: 'article_sub_categories',
        colorTag: '#f59e0b',
        comment: 'Topic subcategories (e.g. HTML, React, MariaDB)',
        columns: [
          { id: 'col-asc-1', name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-asc-2', name: 'category_id', type: 'BIGINT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-asc-3', name: 'sub_category_name', type: 'VARCHAR(100)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-asc-4', name: 'description', type: 'TEXT', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
        ]
      },
      {
        id: 'tbl-article-posts',
        name: 'article_posts',
        colorTag: '#f59e0b',
        comment: 'Full technical blog posts with markdown body and syntax highlighting',
        columns: [
          { id: 'col-ap-1', name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-ap-2', name: 'category_id', type: 'BIGINT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-ap-3', name: 'sub_category_id', type: 'BIGINT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-ap-4', name: 'title', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-ap-5', name: 'slug', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: 'col-ap-6', name: 'thumbnail_url', type: 'VARCHAR(255)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-ap-7', name: 'fill_content', type: 'LONGTEXT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-ap-8', name: 'status_publish', type: 'VARCHAR(20)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: "'Published'" },
          { id: 'col-ap-9', name: 'published_at', type: 'DATE', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
        ]
      },
      {
        id: 'tbl-credentials',
        name: 'credentials',
        colorTag: '#10b981',
        comment: 'Verified professional licenses, certificates, and credentials',
        columns: [
          { id: 'col-cr-1', name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-cr-2', name: 'title', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-cr-3', name: 'issuer', type: 'VARCHAR(150)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-cr-4', name: 'credential_id', type: 'VARCHAR(100)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-cr-5', name: 'credential_url', type: 'VARCHAR(255)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
          { id: 'col-cr-6', name: 'issue_date', type: 'DATE', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-cr-7', name: 'media_url', type: 'VARCHAR(255)', isPrimary: false, isNullable: true, isUnique: false, isAutoIncrement: false },
        ]
      },
      {
        id: 'tbl-contact-messages',
        name: 'contact_messages',
        colorTag: '#f43f5e',
        comment: 'Client inquiries and contact form submissions inbox',
        columns: [
          { id: 'col-cm-1', name: 'id', type: 'BIGSERIAL', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: true },
          { id: 'col-cm-2', name: 'name', type: 'VARCHAR(100)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-cm-3', name: 'email', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-cm-4', name: 'subject', type: 'VARCHAR(200)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-cm-5', name: 'message', type: 'TEXT', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-cm-6', name: 'is_read', type: 'BOOLEAN', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: 'false' },
          { id: 'col-cm-7', name: 'created_at', type: 'TIMESTAMPTZ', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false, defaultValue: 'NOW()' },
        ]
      },
      {
        id: 'tbl-admin-users',
        name: 'admin_users',
        colorTag: '#64748b',
        comment: 'Administrative user accounts and Argon2/Bcrypt password hashes',
        columns: [
          { id: 'col-au-1', name: 'id', type: 'VARCHAR(50)', isPrimary: true, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: 'col-au-2', name: 'username', type: 'VARCHAR(100)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: 'col-au-3', name: 'email', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: true, isAutoIncrement: false },
          { id: 'col-au-4', name: 'password_hash', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
          { id: 'col-au-5', name: 'name', type: 'VARCHAR(255)', isPrimary: false, isNullable: false, isUnique: false, isAutoIncrement: false },
        ]
      }
    ],
    relations: [
      {
        id: 'rel-ts-tc',
        sourceTableId: 'tbl-tech-skills',
        sourceColumnId: 'col-ts-2',
        targetTableId: 'tbl-tech-categories',
        targetColumnId: 'col-tc-1',
        name: 'fk_tech_skills_categories',
        cardinality: '1:N',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      {
        id: 'rel-pr-pc',
        sourceTableId: 'tbl-projects',
        sourceColumnId: 'col-pr-2',
        targetTableId: 'tbl-project-categories',
        targetColumnId: 'col-pc-1',
        name: 'fk_projects_categories',
        cardinality: '1:N',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      {
        id: 'rel-pd-pr',
        sourceTableId: 'tbl-project-details',
        sourceColumnId: 'col-pd-2',
        targetTableId: 'tbl-projects',
        targetColumnId: 'col-pr-1',
        name: 'fk_project_details_projects',
        cardinality: '1:1',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      {
        id: 'rel-pi-pr',
        sourceTableId: 'tbl-project-images',
        sourceColumnId: 'col-pi-2',
        targetTableId: 'tbl-projects',
        targetColumnId: 'col-pr-1',
        name: 'fk_project_images_projects',
        cardinality: '1:N',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      {
        id: 'rel-pt-pr',
        sourceTableId: 'tbl-project-tags',
        sourceColumnId: 'col-pt-2',
        targetTableId: 'tbl-projects',
        targetColumnId: 'col-pr-1',
        name: 'fk_project_tags_projects',
        cardinality: '1:N',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      {
        id: 'rel-pb-pr',
        sourceTableId: 'tbl-project-boms',
        sourceColumnId: 'col-pb-2',
        targetTableId: 'tbl-projects',
        targetColumnId: 'col-pr-1',
        name: 'fk_project_boms_projects',
        cardinality: '1:N',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      {
        id: 'rel-asc-ac',
        sourceTableId: 'tbl-article-sub-categories',
        sourceColumnId: 'col-asc-2',
        targetTableId: 'tbl-article-categories',
        targetColumnId: 'col-ac-1',
        name: 'fk_article_sub_categories_categories',
        cardinality: '1:N',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      {
        id: 'rel-ap-ac',
        sourceTableId: 'tbl-article-posts',
        sourceColumnId: 'col-ap-2',
        targetTableId: 'tbl-article-categories',
        targetColumnId: 'col-ac-1',
        name: 'fk_article_posts_categories',
        cardinality: '1:N',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      },
      {
        id: 'rel-ap-asc',
        sourceTableId: 'tbl-article-posts',
        sourceColumnId: 'col-ap-3',
        targetTableId: 'tbl-article-sub-categories',
        targetColumnId: 'col-asc-1',
        name: 'fk_article_posts_sub_categories',
        cardinality: '1:N',
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE'
      }
    ]
  }
];
