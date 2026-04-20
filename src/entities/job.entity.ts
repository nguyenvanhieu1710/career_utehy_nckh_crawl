import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { CompanyEntity } from "./company.entity";

@Entity("jobs")
export class JobEntity {
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
  title!: string;

  @Column({ type: "varchar", length: 255, unique: true, nullable: true })
  slug!: string;

  @Column({ type: "uuid" })
  company_id!: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  location!: string;

  @Column({ type: "json", nullable: true })
  other_locations!: any;

  @Column({ type: "varchar", length: 50, nullable: true })
  work_arrangement!: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  job_type!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  salary_display!: string;

  @Column({ type: "int", nullable: true })
  salary_min!: number;

  @Column({ type: "int", nullable: true })
  salary_max!: number;

  @Column({ type: "json", nullable: true })
  skills!: any;

  @Column({ type: "text", nullable: true })
  requirements!: string;

  @Column({ type: "text", nullable: true })
  description!: string;

  @Column({ type: "text", nullable: true })
  benefits!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  job_level!: string;

  @Column({ type: "int", nullable: true })
  years_of_experience!: number;

  @Column({ type: "varchar", length: 20, nullable: true })
  status!: string;

  @Column({ type: "uuid", nullable: true })
  source_id!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  url_source!: string;

  @Column({ type: "timestamp", nullable: true })
  posted_at!: Date;

  @Column({ type: "timestamp", nullable: true })
  expired_at!: Date;

  @ManyToOne(() => CompanyEntity, (company) => company.jobs)
  @JoinColumn({ name: "company_id" })
  company!: CompanyEntity;
}
