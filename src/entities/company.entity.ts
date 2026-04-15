import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { JobEntity } from "./job.entity";

@Entity("companies")
export class CompanyEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column({ name: "action_status", type: "varchar", length: 20, default: "active" })
  action_status!: string;

  @CreateDateColumn({ type: "timestamp with time zone", default: () => "CURRENT_TIMESTAMP" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
  updated_at!: Date;

  @Column({ type: "uuid", nullable: true })
  created_by_user_id!: string | null;

  @Column({ type: "uuid", nullable: true })
  updated_by_user_id!: string | null;

  @Column({ type: "varchar", length: 200 })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true, nullable: true })
  slug!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  logo_url!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  website!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  address!: string;

  @Column({ type: "text", nullable: true })
  description!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  industry!: string;

  @Column({ type: "json", nullable: true })
  sub_industries!: any;

  @Column({ type: "varchar", length: 50, nullable: true })
  size!: string;

  @Column({ type: "json", nullable: true })
  locations!: any;

  @Column({ type: "varchar", length: 100, nullable: true })
  email!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  support_email!: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone!: string;

  @OneToMany(() => JobEntity, (job) => job.company)
  jobs!: JobEntity[];
}
