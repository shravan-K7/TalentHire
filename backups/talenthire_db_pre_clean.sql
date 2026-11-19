--
-- PostgreSQL database dump
--

\restrict JhbOaldKi0EcxJmidzNorLMKNjQQ1Vv2ITUSrDXwBY8mdSGyxggOShYCmSBUjDm

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.django_admin_log DROP CONSTRAINT IF EXISTS django_admin_log_user_id_c564eba6_fk_auth_user_id;
ALTER TABLE IF EXISTS ONLY public.django_admin_log DROP CONSTRAINT IF EXISTS django_admin_log_content_type_id_c4bce8eb_fk_django_co;
ALTER TABLE IF EXISTS ONLY public.auth_user_user_permissions DROP CONSTRAINT IF EXISTS auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id;
ALTER TABLE IF EXISTS ONLY public.auth_user_user_permissions DROP CONSTRAINT IF EXISTS auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm;
ALTER TABLE IF EXISTS ONLY public.auth_user_groups DROP CONSTRAINT IF EXISTS auth_user_groups_user_id_6a12ed8b_fk_auth_user_id;
ALTER TABLE IF EXISTS ONLY public.auth_user_groups DROP CONSTRAINT IF EXISTS auth_user_groups_group_id_97559544_fk_auth_group_id;
ALTER TABLE IF EXISTS ONLY public.auth_permission DROP CONSTRAINT IF EXISTS auth_permission_content_type_id_2f476e4b_fk_django_co;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissions_group_id_b120cbf9_fk_auth_group_id;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissio_permission_id_84c5c92e_fk_auth_perm;
ALTER TABLE IF EXISTS ONLY public.app_review DROP CONSTRAINT IF EXISTS app_review_customer_id_07eb27f9_fk_auth_user_id;
ALTER TABLE IF EXISTS ONLY public.app_review DROP CONSTRAINT IF EXISTS app_review_booking_id_b4229df5_fk_app_booking_id;
ALTER TABLE IF EXISTS ONLY public.app_review DROP CONSTRAINT IF EXISTS app_review_artist_id_65084307_fk_app_artistprofile_id;
ALTER TABLE IF EXISTS ONLY public.app_reschedulingrequest DROP CONSTRAINT IF EXISTS app_reschedulingrequest_customer_id_48379ae8_fk_auth_user_id;
ALTER TABLE IF EXISTS ONLY public.app_reschedulingrequest DROP CONSTRAINT IF EXISTS app_reschedulingrequest_booking_id_2753e21f_fk_app_booking_id;
ALTER TABLE IF EXISTS ONLY public.app_reschedulingrequest DROP CONSTRAINT IF EXISTS app_reschedulingrequ_artist_id_12ee3a3d_fk_app_artis;
ALTER TABLE IF EXISTS ONLY public.app_refund DROP CONSTRAINT IF EXISTS app_refund_payment_id_c6259041_fk_app_payment_id;
ALTER TABLE IF EXISTS ONLY public.app_refund DROP CONSTRAINT IF EXISTS app_refund_booking_id_d5e90244_fk_app_booking_id;
ALTER TABLE IF EXISTS ONLY public.app_portfolio DROP CONSTRAINT IF EXISTS app_portfolio_artist_id_fac15151_fk_app_artistprofile_id;
ALTER TABLE IF EXISTS ONLY public.app_payment DROP CONSTRAINT IF EXISTS app_payment_booking_id_e314d038_fk_app_booking_id;
ALTER TABLE IF EXISTS ONLY public.app_notification DROP CONSTRAINT IF EXISTS app_notification_user_id_6ab9311d_fk_auth_user_id;
ALTER TABLE IF EXISTS ONLY public.app_favoriteartist DROP CONSTRAINT IF EXISTS app_favoriteartist_customer_id_6c34428c_fk_auth_user_id;
ALTER TABLE IF EXISTS ONLY public.app_favoriteartist DROP CONSTRAINT IF EXISTS app_favoriteartist_artist_id_ec2005e1_fk_app_artistprofile_id;
ALTER TABLE IF EXISTS ONLY public.app_customerprofile DROP CONSTRAINT IF EXISTS app_customerprofile_user_id_b693c635_fk_auth_user_id;
ALTER TABLE IF EXISTS ONLY public.app_bookingcancellation DROP CONSTRAINT IF EXISTS app_bookingcancellation_refund_id_bbbb3236_fk_app_refund_id;
ALTER TABLE IF EXISTS ONLY public.app_bookingcancellation DROP CONSTRAINT IF EXISTS app_bookingcancellation_booking_id_90882762_fk_app_booking_id;
ALTER TABLE IF EXISTS ONLY public.app_bookingcancellation DROP CONSTRAINT IF EXISTS app_bookingcancellat_cancelled_by_user_id_d6f2be02_fk_auth_user;
ALTER TABLE IF EXISTS ONLY public.app_booking DROP CONSTRAINT IF EXISTS app_booking_customer_id_cc72655a_fk_auth_user_id;
ALTER TABLE IF EXISTS ONLY public.app_booking DROP CONSTRAINT IF EXISTS app_booking_artist_id_f1a4d815_fk_app_artistprofile_id;
ALTER TABLE IF EXISTS ONLY public.app_artistprofile DROP CONSTRAINT IF EXISTS app_artistprofile_user_id_93f4d352_fk_auth_user_id;
ALTER TABLE IF EXISTS ONLY public.app_artistprofile DROP CONSTRAINT IF EXISTS app_artistprofile_category_id_7de4199f_fk_app_category_id;
ALTER TABLE IF EXISTS ONLY public.app_artistavailability DROP CONSTRAINT IF EXISTS app_artistavailabili_artist_id_3b1948be_fk_app_artis;
DROP INDEX IF EXISTS public.django_session_session_key_c0390e0f_like;
DROP INDEX IF EXISTS public.django_session_expire_date_a5c62663;
DROP INDEX IF EXISTS public.django_admin_log_user_id_c564eba6;
DROP INDEX IF EXISTS public.django_admin_log_content_type_id_c4bce8eb;
DROP INDEX IF EXISTS public.auth_user_username_6821ab7c_like;
DROP INDEX IF EXISTS public.auth_user_user_permissions_user_id_a95ead1b;
DROP INDEX IF EXISTS public.auth_user_user_permissions_permission_id_1fbb5f2c;
DROP INDEX IF EXISTS public.auth_user_groups_user_id_6a12ed8b;
DROP INDEX IF EXISTS public.auth_user_groups_group_id_97559544;
DROP INDEX IF EXISTS public.auth_permission_content_type_id_2f476e4b;
DROP INDEX IF EXISTS public.auth_group_permissions_permission_id_84c5c92e;
DROP INDEX IF EXISTS public.auth_group_permissions_group_id_b120cbf9;
DROP INDEX IF EXISTS public.auth_group_name_a6ea08ec_like;
DROP INDEX IF EXISTS public.app_review_customer_id_07eb27f9;
DROP INDEX IF EXISTS public.app_review_artist_id_65084307;
DROP INDEX IF EXISTS public.app_reschedulingrequest_customer_id_48379ae8;
DROP INDEX IF EXISTS public.app_reschedulingrequest_booking_id_2753e21f;
DROP INDEX IF EXISTS public.app_reschedulingrequest_artist_id_12ee3a3d;
DROP INDEX IF EXISTS public.app_refund_razorpay_refund_id_ff396a74_like;
DROP INDEX IF EXISTS public.app_refund_payment_id_c6259041;
DROP INDEX IF EXISTS public.app_refund_idempotency_key_6c991660_like;
DROP INDEX IF EXISTS public.app_refund_booking_id_d5e90244;
DROP INDEX IF EXISTS public.app_processedwebhookevent_event_id_8d983cbc_like;
DROP INDEX IF EXISTS public.app_portfolio_artist_id_fac15151;
DROP INDEX IF EXISTS public.app_payment_transaction_id_6dc41051_like;
DROP INDEX IF EXISTS public.app_payment_razorpay_order_id_3f3270c6_like;
DROP INDEX IF EXISTS public.app_notification_user_id_6ab9311d;
DROP INDEX IF EXISTS public.app_favoriteartist_customer_id_6c34428c;
DROP INDEX IF EXISTS public.app_favoriteartist_artist_id_ec2005e1;
DROP INDEX IF EXISTS public.app_category_name_06e7588b_like;
DROP INDEX IF EXISTS public.app_bookingcancellation_refund_id_bbbb3236;
DROP INDEX IF EXISTS public.app_bookingcancellation_cancelled_by_user_id_d6f2be02;
DROP INDEX IF EXISTS public.app_booking_customer_id_cc72655a;
DROP INDEX IF EXISTS public.app_booking_artist_id_f1a4d815;
DROP INDEX IF EXISTS public.app_artistprofile_category_id_7de4199f;
DROP INDEX IF EXISTS public.app_artistavailability_artist_id_3b1948be;
ALTER TABLE IF EXISTS ONLY public.django_session DROP CONSTRAINT IF EXISTS django_session_pkey;
ALTER TABLE IF EXISTS ONLY public.django_migrations DROP CONSTRAINT IF EXISTS django_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public.django_content_type DROP CONSTRAINT IF EXISTS django_content_type_pkey;
ALTER TABLE IF EXISTS ONLY public.django_content_type DROP CONSTRAINT IF EXISTS django_content_type_app_label_model_76bd3d3b_uniq;
ALTER TABLE IF EXISTS ONLY public.django_admin_log DROP CONSTRAINT IF EXISTS django_admin_log_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_user DROP CONSTRAINT IF EXISTS auth_user_username_key;
ALTER TABLE IF EXISTS ONLY public.auth_user_user_permissions DROP CONSTRAINT IF EXISTS auth_user_user_permissions_user_id_permission_id_14a6b632_uniq;
ALTER TABLE IF EXISTS ONLY public.auth_user_user_permissions DROP CONSTRAINT IF EXISTS auth_user_user_permissions_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_user DROP CONSTRAINT IF EXISTS auth_user_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_user_groups DROP CONSTRAINT IF EXISTS auth_user_groups_user_id_group_id_94350c0c_uniq;
ALTER TABLE IF EXISTS ONLY public.auth_user_groups DROP CONSTRAINT IF EXISTS auth_user_groups_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_permission DROP CONSTRAINT IF EXISTS auth_permission_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_permission DROP CONSTRAINT IF EXISTS auth_permission_content_type_id_codename_01ab375a_uniq;
ALTER TABLE IF EXISTS ONLY public.auth_group DROP CONSTRAINT IF EXISTS auth_group_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissions_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissions_group_id_permission_id_0cd325b0_uniq;
ALTER TABLE IF EXISTS ONLY public.auth_group DROP CONSTRAINT IF EXISTS auth_group_name_key;
ALTER TABLE IF EXISTS ONLY public.app_review DROP CONSTRAINT IF EXISTS app_review_pkey;
ALTER TABLE IF EXISTS ONLY public.app_review DROP CONSTRAINT IF EXISTS app_review_booking_id_key;
ALTER TABLE IF EXISTS ONLY public.app_reschedulingrequest DROP CONSTRAINT IF EXISTS app_reschedulingrequest_pkey;
ALTER TABLE IF EXISTS ONLY public.app_refund DROP CONSTRAINT IF EXISTS app_refund_razorpay_refund_id_key;
ALTER TABLE IF EXISTS ONLY public.app_refund DROP CONSTRAINT IF EXISTS app_refund_pkey;
ALTER TABLE IF EXISTS ONLY public.app_refund DROP CONSTRAINT IF EXISTS app_refund_idempotency_key_key;
ALTER TABLE IF EXISTS ONLY public.app_processedwebhookevent DROP CONSTRAINT IF EXISTS app_processedwebhookevent_pkey;
ALTER TABLE IF EXISTS ONLY public.app_processedwebhookevent DROP CONSTRAINT IF EXISTS app_processedwebhookevent_event_id_key;
ALTER TABLE IF EXISTS ONLY public.app_portfolio DROP CONSTRAINT IF EXISTS app_portfolio_pkey;
ALTER TABLE IF EXISTS ONLY public.app_payment DROP CONSTRAINT IF EXISTS app_payment_transaction_id_key;
ALTER TABLE IF EXISTS ONLY public.app_payment DROP CONSTRAINT IF EXISTS app_payment_razorpay_order_id_key;
ALTER TABLE IF EXISTS ONLY public.app_payment DROP CONSTRAINT IF EXISTS app_payment_pkey;
ALTER TABLE IF EXISTS ONLY public.app_payment DROP CONSTRAINT IF EXISTS app_payment_booking_id_key;
ALTER TABLE IF EXISTS ONLY public.app_notification DROP CONSTRAINT IF EXISTS app_notification_pkey;
ALTER TABLE IF EXISTS ONLY public.app_favoriteartist DROP CONSTRAINT IF EXISTS app_favoriteartist_pkey;
ALTER TABLE IF EXISTS ONLY public.app_favoriteartist DROP CONSTRAINT IF EXISTS app_favoriteartist_customer_id_artist_id_ca462a87_uniq;
ALTER TABLE IF EXISTS ONLY public.app_customerprofile DROP CONSTRAINT IF EXISTS app_customerprofile_user_id_key;
ALTER TABLE IF EXISTS ONLY public.app_customerprofile DROP CONSTRAINT IF EXISTS app_customerprofile_pkey;
ALTER TABLE IF EXISTS ONLY public.app_category DROP CONSTRAINT IF EXISTS app_category_pkey;
ALTER TABLE IF EXISTS ONLY public.app_category DROP CONSTRAINT IF EXISTS app_category_name_key;
ALTER TABLE IF EXISTS ONLY public.app_bookingcancellation DROP CONSTRAINT IF EXISTS app_bookingcancellation_pkey;
ALTER TABLE IF EXISTS ONLY public.app_bookingcancellation DROP CONSTRAINT IF EXISTS app_bookingcancellation_booking_id_key;
ALTER TABLE IF EXISTS ONLY public.app_booking DROP CONSTRAINT IF EXISTS app_booking_pkey;
ALTER TABLE IF EXISTS ONLY public.app_artistprofile DROP CONSTRAINT IF EXISTS app_artistprofile_user_id_key;
ALTER TABLE IF EXISTS ONLY public.app_artistprofile DROP CONSTRAINT IF EXISTS app_artistprofile_pkey;
ALTER TABLE IF EXISTS ONLY public.app_artistavailability DROP CONSTRAINT IF EXISTS app_artistavailability_pkey;
ALTER TABLE IF EXISTS ONLY public.app_artistavailability DROP CONSTRAINT IF EXISTS app_artistavailability_artist_id_date_69b7511a_uniq;
DROP TABLE IF EXISTS public.django_session;
DROP TABLE IF EXISTS public.django_migrations;
DROP TABLE IF EXISTS public.django_content_type;
DROP TABLE IF EXISTS public.django_admin_log;
DROP TABLE IF EXISTS public.auth_user_user_permissions;
DROP TABLE IF EXISTS public.auth_user_groups;
DROP TABLE IF EXISTS public.auth_user;
DROP TABLE IF EXISTS public.auth_permission;
DROP TABLE IF EXISTS public.auth_group_permissions;
DROP TABLE IF EXISTS public.auth_group;
DROP TABLE IF EXISTS public.app_review;
DROP TABLE IF EXISTS public.app_reschedulingrequest;
DROP TABLE IF EXISTS public.app_refund;
DROP TABLE IF EXISTS public.app_processedwebhookevent;
DROP TABLE IF EXISTS public.app_portfolio;
DROP TABLE IF EXISTS public.app_payment;
DROP TABLE IF EXISTS public.app_notification;
DROP TABLE IF EXISTS public.app_favoriteartist;
DROP TABLE IF EXISTS public.app_customerprofile;
DROP TABLE IF EXISTS public.app_category;
DROP TABLE IF EXISTS public.app_bookingcancellation;
DROP TABLE IF EXISTS public.app_booking;
DROP TABLE IF EXISTS public.app_artistprofile;
DROP TABLE IF EXISTS public.app_artistavailability;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_artistavailability; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_artistavailability (
    id bigint NOT NULL,
    date date NOT NULL,
    is_available boolean NOT NULL,
    reason character varying(200) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    artist_id bigint NOT NULL
);


ALTER TABLE public.app_artistavailability OWNER TO postgres;

--
-- Name: app_artistavailability_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.app_artistavailability ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.app_artistavailability_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: app_artistprofile; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_artistprofile (
    id bigint NOT NULL,
    stage_name character varying(150) NOT NULL,
    bio text NOT NULL,
    location character varying(150) NOT NULL,
    phone character varying(20) NOT NULL,
    profile_image character varying(100),
    starting_price numeric(10,2) NOT NULL,
    is_verified boolean NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    user_id integer NOT NULL,
    category_id bigint NOT NULL,
    additional_information text NOT NULL,
    performance_types jsonb NOT NULL,
    portfolio_url character varying(200) NOT NULL,
    travel_availability character varying(50) NOT NULL,
    years_of_experience smallint NOT NULL,
    gender character varying(20) NOT NULL,
    CONSTRAINT app_artistprofile_years_of_experience_check CHECK ((years_of_experience >= 0))
);


ALTER TABLE public.app_artistprofile OWNER TO postgres;

--
-- Name: app_artistprofile_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.app_artistprofile ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.app_artistprofile_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: app_booking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_booking (
    id bigint NOT NULL,
    event_type character varying(100) NOT NULL,
    event_date timestamp with time zone NOT NULL,
    event_location character varying(200) NOT NULL,
    message text NOT NULL,
    agreed_price numeric(10,2),
    status character varying(20) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    artist_id bigint NOT NULL,
    customer_id integer NOT NULL,
    response_message text NOT NULL,
    expected_audience_size integer,
    performance_duration character varying(50) NOT NULL,
    customer_budget numeric(10,2),
    customer_phone character varying(20) NOT NULL,
    accepted_at timestamp with time zone,
    CONSTRAINT app_booking_expected_audience_size_check CHECK ((expected_audience_size >= 0))
);


ALTER TABLE public.app_booking OWNER TO postgres;

--
-- Name: app_booking_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.app_booking ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.app_booking_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: app_bookingcancellation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_bookingcancellation (
    id bigint NOT NULL,
    cancelled_by character varying(20) NOT NULL,
    reason text NOT NULL,
    policy_applied character varying(255) NOT NULL,
    refund_percentage numeric(5,2) NOT NULL,
    paid_amount numeric(10,2) NOT NULL,
    refund_amount numeric(10,2) NOT NULL,
    retained_amount numeric(10,2) NOT NULL,
    platform_fee numeric(10,2) NOT NULL,
    artist_payout numeric(10,2) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    booking_id bigint NOT NULL,
    cancelled_by_user_id integer NOT NULL,
    refund_id bigint
);


ALTER TABLE public.app_bookingcancellation OWNER TO postgres;

--
-- Name: app_bookingcancellation_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.app_bookingcancellation ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.app_bookingcancellation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: app_category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_category (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    description text NOT NULL
);


ALTER TABLE public.app_category OWNER TO postgres;

--
-- Name: app_category_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.app_category ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.app_category_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: app_customerprofile; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_customerprofile (
    id bigint NOT NULL,
    phone character varying(20) NOT NULL,
    location character varying(150) NOT NULL,
    profile_image character varying(100),
    is_verified boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public.app_customerprofile OWNER TO postgres;

--
-- Name: app_customerprofile_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.app_customerprofile ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.app_customerprofile_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: app_favoriteartist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_favoriteartist (
    id bigint NOT NULL,
    created_at timestamp with time zone NOT NULL,
    artist_id bigint NOT NULL,
    customer_id integer NOT NULL
);


ALTER TABLE public.app_favoriteartist OWNER TO postgres;

--
-- Name: app_favoriteartist_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.app_favoriteartist ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.app_favoriteartist_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: app_notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_notification (
    id bigint NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    notification_type character varying(50) NOT NULL,
    is_read boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public.app_notification OWNER TO postgres;

--
-- Name: app_notification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.app_notification ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.app_notification_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: app_payment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_payment (
    id bigint NOT NULL,
    amount numeric(10,2) NOT NULL,
    transaction_id character varying(255),
    status character varying(20) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    booking_id bigint NOT NULL,
    artist_amount numeric(10,2) NOT NULL,
    commission_amount numeric(10,2) NOT NULL,
    commission_percentage numeric(5,2) NOT NULL,
    razorpay_order_id character varying(100),
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.app_payment OWNER TO postgres;

--
-- Name: app_payment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.app_payment ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.app_payment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: app_portfolio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_portfolio (
    id bigint NOT NULL,
    title character varying(150) NOT NULL,
    description text NOT NULL,
    media_url character varying(200) NOT NULL,
    uploaded_at timestamp with time zone NOT NULL,
    artist_id bigint NOT NULL
);


ALTER TABLE public.app_portfolio OWNER TO postgres;

--
-- Name: app_portfolio_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.app_portfolio ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.app_portfolio_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: app_processedwebhookevent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_processedwebhookevent (
    id bigint NOT NULL,
    event_id character varying(120) NOT NULL,
    event_type character varying(100) NOT NULL,
    payload_hash character varying(64) NOT NULL,
    processed_at timestamp with time zone NOT NULL
);


ALTER TABLE public.app_processedwebhookevent OWNER TO postgres;

--
-- Name: app_processedwebhookevent_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.app_processedwebhookevent ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.app_processedwebhookevent_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: app_refund; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_refund (
    id bigint NOT NULL,
    razorpay_refund_id character varying(100),
    amount numeric(10,2) NOT NULL,
    currency character varying(10) NOT NULL,
    status character varying(20) NOT NULL,
    reason character varying(255) NOT NULL,
    failure_reason text NOT NULL,
    idempotency_key character varying(150) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    booking_id bigint NOT NULL,
    payment_id bigint NOT NULL
);


ALTER TABLE public.app_refund OWNER TO postgres;

--
-- Name: app_refund_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.app_refund ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.app_refund_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: app_reschedulingrequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_reschedulingrequest (
    id bigint NOT NULL,
    original_event_date timestamp with time zone NOT NULL,
    new_event_date timestamp with time zone NOT NULL,
    reason text NOT NULL,
    artist_response text NOT NULL,
    status character varying(20) NOT NULL,
    requested_at timestamp with time zone NOT NULL,
    responded_at timestamp with time zone,
    artist_id bigint NOT NULL,
    booking_id bigint NOT NULL,
    customer_id integer NOT NULL
);


ALTER TABLE public.app_reschedulingrequest OWNER TO postgres;

--
-- Name: app_reschedulingrequest_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.app_reschedulingrequest ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.app_reschedulingrequest_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: app_review; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_review (
    id bigint NOT NULL,
    rating smallint NOT NULL,
    comment text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    artist_id bigint NOT NULL,
    booking_id bigint NOT NULL,
    customer_id integer NOT NULL,
    CONSTRAINT app_review_rating_check CHECK ((rating >= 0)),
    CONSTRAINT review_rating_1_to_5 CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.app_review OWNER TO postgres;

--
-- Name: app_review_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.app_review ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.app_review_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_group; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_group (
    id integer NOT NULL,
    name character varying(150) NOT NULL
);


ALTER TABLE public.auth_group OWNER TO postgres;

--
-- Name: auth_group_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.auth_group ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_group_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_group_permissions (
    id bigint NOT NULL,
    group_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.auth_group_permissions OWNER TO postgres;

--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.auth_group_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_permission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_permission (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    content_type_id integer NOT NULL,
    codename character varying(100) NOT NULL
);


ALTER TABLE public.auth_permission OWNER TO postgres;

--
-- Name: auth_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.auth_permission ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_user (
    id integer NOT NULL,
    password character varying(128) NOT NULL,
    last_login timestamp with time zone,
    is_superuser boolean NOT NULL,
    username character varying(150) NOT NULL,
    first_name character varying(150) NOT NULL,
    last_name character varying(150) NOT NULL,
    email character varying(254) NOT NULL,
    is_staff boolean NOT NULL,
    is_active boolean NOT NULL,
    date_joined timestamp with time zone NOT NULL
);


ALTER TABLE public.auth_user OWNER TO postgres;

--
-- Name: auth_user_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_user_groups (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    group_id integer NOT NULL
);


ALTER TABLE public.auth_user_groups OWNER TO postgres;

--
-- Name: auth_user_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.auth_user_groups ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_user_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.auth_user ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_user_user_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_user_user_permissions (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.auth_user_user_permissions OWNER TO postgres;

--
-- Name: auth_user_user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.auth_user_user_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_user_user_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_admin_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.django_admin_log (
    id integer NOT NULL,
    action_time timestamp with time zone NOT NULL,
    object_id text,
    object_repr character varying(200) NOT NULL,
    action_flag smallint NOT NULL,
    change_message text NOT NULL,
    content_type_id integer,
    user_id integer NOT NULL,
    CONSTRAINT django_admin_log_action_flag_check CHECK ((action_flag >= 0))
);


ALTER TABLE public.django_admin_log OWNER TO postgres;

--
-- Name: django_admin_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.django_admin_log ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_admin_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_content_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.django_content_type (
    id integer NOT NULL,
    app_label character varying(100) NOT NULL,
    model character varying(100) NOT NULL
);


ALTER TABLE public.django_content_type OWNER TO postgres;

--
-- Name: django_content_type_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.django_content_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_content_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.django_migrations (
    id bigint NOT NULL,
    app character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    applied timestamp with time zone NOT NULL
);


ALTER TABLE public.django_migrations OWNER TO postgres;

--
-- Name: django_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.django_migrations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.django_session (
    session_key character varying(40) NOT NULL,
    session_data text NOT NULL,
    expire_date timestamp with time zone NOT NULL
);


ALTER TABLE public.django_session OWNER TO postgres;

--
-- Data for Name: app_artistavailability; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_artistavailability (id, date, is_available, reason, created_at, artist_id) FROM stdin;
1	2026-12-20	f	Personal Commitment	2026-11-14 11:12:54.123741+05:30	4
\.


--
-- Data for Name: app_artistprofile; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_artistprofile (id, stage_name, bio, location, phone, profile_image, starting_price, is_verified, is_active, created_at, user_id, category_id, additional_information, performance_types, portfolio_url, travel_availability, years_of_experience, gender) FROM stdin;
8	The Royal Symphony Strings	Grand classical-meets-cinematic string quartet with violins, cello, flute, and Indian sitar. Specializes in regal welcome instrumental pieces, Hollywood cinematic themes, and instrumental pop adaptations.	Jaipur, Rajasthan			55000.00	t	t	2026-11-01 09:23:11.977838+05:30	10	4	Regal Royal Palace & Cinematic Strings Suite	["Group performance", "Weddings", "Corporate events"]	https://www.youtube.com/watch?v=sample4	international	11	other
10	Malhar Rock & Sufi Ensemble	Dynamic 5-piece indie-rock and sufi fusion band blending electric guitars, Punjabi dholak, keyboard synth, and powerful vocal harmonies. Renowned for spellbinding 3-hour marathon live sets.	Hyderabad, Telangana			60000.00	t	t	2026-11-01 09:23:12.82964+05:30	12	6	Piya Re & Damadam Mast Qalandar Rock Riffs	["Group performance", "Festivals", "Weddings", "Corporate events"]	https://www.youtube.com/watch?v=sample6	international	10	other
9	Neha Kapoor (Celebrity Emcee)	Charismatic, bilingual English & Hindi anchor specializing in tech summits, annual award ceremonies, sports galas, and lively wedding receptions with audience engagement games and stage moderation.	Pune, Maharashtra			18000.00	t	t	2026-11-01 09:23:12.404844+05:30	11	5	Filmfare Red Carpet & Fortune 500 Gala Host	["Solo performance", "Corporate events", "Weddings", "Live events"]	https://www.youtube.com/watch?v=sample5	india	8	female
5	Aarav Sharma & The Acoustic Waves	Soulful Bollywood, Sufi fusion, and contemporary pop solo vocalist. Performed at over 300+ destination weddings and luxury corporate galas across Goa, Udaipur, and Mumbai with pristine acoustic arrangement.	Mumbai, Maharashtra			22000.00	t	t	2026-11-01 09:23:10.685585+05:30	7	1	Tum Hi Ho Acoustic Cover • MTV Unplugged Style	["Solo performance", "Weddings", "Corporate events", "Live events"]	https://www.youtube.com/watch?v=sample1	india	7	male
7	DJ Karan (Pulse Electronic)	Open-format club, Punjabi techno, commercial EDM, and retro Bollywood mashup maestro. Resident DJ at premier nightlife venues in Gurgaon and regular headline artist for luxury Sangeet celebrations.	Delhi NCR, Delhi			35000.00	t	t	2026-11-01 09:23:11.559132+05:30	9	3	Electronic Punjabi Mashups & Club Tech-House	["Solo performance", "Weddings", "Private parties", "Festivals"]	https://soundcloud.com/sample3	international	9	male
6	Urban Bounce Dance Troupe	High-octane urban hip-hop, contemporary fusion, and thematic flash-mob performers. Finalists in national collegiate dance battles with bespoke LED visual synchronization and high-energy choreography.	Bengaluru, Karnataka			45000.00	t	t	2026-11-01 09:23:11.116495+05:30	8	2	Choreography Finalists • World of Dance India	["Group performance", "Corporate events", "Festivals", "Live events"]	https://www.youtube.com/watch?v=sample2	india	6	other
17	Stage Star Performer		Mumbai, Maharashtra			15000.00	f	t	2026-11-01 16:16:43.638773+05:30	39	1		[]		city	0	male
4	YesKey	A singer is a vocal artist who uses the voice as a musical instrument to produce melody, harmony, and rhythm, connecting with listeners through emotion and technique.	Kasaragod	987654321		5000.00	f	t	2026-11-01 09:13:04.034327+05:30	2	1	Thoomanjin Kulirilo - Film Song & Melodies	["Solo performance", "Live events", "Weddings", "Private parties", "Festivals", "Corporate events"]		state	3	male
\.


--
-- Data for Name: app_booking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_booking (id, event_type, event_date, event_location, message, agreed_price, status, created_at, artist_id, customer_id, response_message, expected_audience_size, performance_duration, customer_budget, customer_phone, accepted_at) FROM stdin;
2	College Event	2026-11-15 05:30:00+05:30	Kannur		6000.00	accepted	2026-11-08 11:07:32.105903+05:30	4	3	Booking accpeted and final price confirmed.	250	3 hours	6000.00		\N
3	Corporate Event	2026-11-30 05:30:00+05:30	Payyanur		5500.00	accepted	2026-11-13 10:58:45.300945+05:30	4	46	Booking accpeted and final price confirmed.	150	2 hours	5500.00		\N
4	College Event	2026-12-15 05:30:00+05:30	Taliparamba		5350.00	accepted	2026-11-13 11:59:05.926092+05:30	4	47	Booking accepted and final price confirmed.	100	2 hours	5350.00		\N
6	Cocktail Party	2027-01-10 05:30:00+05:30	Hyderabad		\N	pending	2026-11-14 16:12:43.819272+05:30	4	49		\N	2 hours	6000.00		\N
5	Wedding Reception	2027-01-10 05:30:00+05:30	Hyderabad		5500.00	accepted	2026-11-14 16:06:52.163832+05:30	4	48	Happy to perform at your reception!	\N	2 hours	5000.00		2026-11-14 16:18:36.859506+05:30
7	Birthday Party	2027-01-25 05:30:00+05:30	Kasaragod		6000.00	accepted	2026-11-14 16:24:27.502727+05:30	4	48	Booking accepted and final price confirmed.	\N	2 hours	\N		2026-11-14 16:28:24.399625+05:30
8	Live Concert	2027-11-20 18:00:00+05:30	Hyderabad Exhibition Grounds	Test 1 - Automated Reservation Expiry Verification	25000.00	expired	2026-11-15 09:21:02.067418+05:30	4	46	Reservation expired: payment was not completed within the 24-hour deadline.	\N		\N		2026-11-14 03:21:02.065983+05:30
9	Phase 5 Refund Integration Test	2027-12-25 18:00:00+05:30	Bangalore (Test Hall)		240.00	accepted	2026-11-15 10:01:40.272047+05:30	4	3		\N		\N	+917907899186	2026-11-15 10:01:40.265402+05:30
10	College Event	2026-11-30 05:30:00+05:30	Delhi NCR, Delhi		35000.00	accepted	2026-11-15 11:17:37.586913+05:30	7	48	Booking accepted and final price confirmed.	250	2 hours	35000.00	7907899186	2026-11-15 11:20:15.835059+05:30
11	Music / Cultural Festival	2026-11-29 19:00:00+05:30	pune		22000.00	accepted	2026-11-16 09:49:47.739538+05:30	5	48	Booking accepted and final price confirmed.	300	2 hours	22000.00	7907899186	2026-11-16 09:51:58.919287+05:30
13	Sangeet / Reception	2026-12-10 18:00:00+05:30	Jaipur, Rajasthan		55000.00	cancelled	2026-11-16 10:55:46.491084+05:30	8	51	Booking accepted and final price confirmed.	180	1.5 hours	55000.00	9874563210	2026-11-16 10:56:14.329992+05:30
14	Corporate Event	2026-11-20 16:00:00+05:30	Jaipur, Rajasthan		55000.00	cancelled	2026-11-16 11:04:50.850225+05:30	8	51	Booking accepted and final price confirmed.	100	1 hour	55000.00	9845213025	2026-11-16 11:05:13.225175+05:30
15	Private Party / Birthday	2026-11-18 16:00:00+05:30	Jaipur, Rajasthan		55000.00	cancelled	2026-11-16 14:52:18.184033+05:30	8	51	Booking accepted and final price confirmed.	175	2 hours	55000.00	9874563210	2026-11-16 14:52:44.909007+05:30
16	College Event	2026-11-28 20:00:00+05:30	Delhi NCR, Delhi		35000.00	cancelled	2026-11-16 14:59:27.268693+05:30	7	51	Booking accepted and final price confirmed.	250	2 hours	35000.00	9874563210	2026-11-16 15:01:11.937887+05:30
17	Wedding	2026-11-25 18:00:00+05:30	Delhi NCR, Delhi		35000.00	expired	2026-11-17 10:11:00.119827+05:30	7	51	Reservation expired: payment was not completed within the 24-hour deadline.	300	1.5 hours	35000.00	9874563210	2026-11-16 09:12:45.835382+05:30
19	Music / Cultural Festival	2026-11-25 19:00:00+05:30	Delhi NCR, Delhi		\N	pending	2026-11-17 10:17:35.720034+05:30	7	48		200	1.5 hours	35000.00	7907899186	\N
18	College Event	2026-11-25 20:00:00+05:30	Delhi NCR, Delhi		35600.00	accepted	2026-11-17 10:16:47.321632+05:30	7	51	Booking accepted and final price confirmed.	250	2 hours	35000.00	9874563210	2026-11-17 10:18:41.562763+05:30
\.


--
-- Data for Name: app_bookingcancellation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_bookingcancellation (id, cancelled_by, reason, policy_applied, refund_percentage, paid_amount, refund_amount, retained_amount, platform_fee, artist_payout, created_at, booking_id, cancelled_by_user_id, refund_id) FROM stdin;
1	customer	Schedule change.	Customer cancellation > 7 days before event (100% refund)	100.00	55000.00	55000.00	0.00	0.00	0.00	2026-11-16 10:58:49.768736+05:30	13	51	2
2	customer	Schedule change	Customer cancellation 3–7 days before event (50% refund)	50.00	55000.00	27500.00	27500.00	2200.00	25300.00	2026-11-16 11:06:42.848123+05:30	14	51	3
3	customer	Change in event plans.	Customer cancellation < 3 days before event (0% refund)	0.00	55000.00	0.00	55000.00	4400.00	50600.00	2026-11-16 14:57:28.565035+05:30	15	51	\N
4	artist	Artist unavailable due to an emergency.	Artist cancellation (100% refund)	100.00	35000.00	35000.00	0.00	0.00	0.00	2026-11-16 15:03:32.448621+05:30	16	9	4
\.


--
-- Data for Name: app_category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_category (id, name, description) FROM stdin;
1	Singers & Vocalists	Classical, Bollywood, Pop, Jazz, Rock and acoustic solo vocalists.
2	Dance Groups	Hip-hop crews, classical fusion, contemporary, and high-energy stage dancers.
3	Live DJs & Producers	Club, EDM, techno, wedding DJs, and open-format master turntablists.
4	Orchestra & Instrumental	Symphonies, string quartets, fusion instrumentalists, flautists, and sitar masters.
5	Anchors & Emcees	Engaging corporate hosts, bilingual emcees, and energetic stage moderators.
6	Live Bands & Ensembles	Indie rock, pop cover bands, sufi fusion, and brass marching ensembles.
\.


--
-- Data for Name: app_customerprofile; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_customerprofile (id, phone, location, profile_image, is_verified, created_at, updated_at, user_id) FROM stdin;
2	+91 9123456789	Pune, Maharashtra		t	2026-11-01 16:17:36.138635+05:30	2026-11-01 16:17:36.164161+05:30	40
4				t	2026-11-02 09:57:19.451361+05:30	2026-11-02 09:57:19.451375+05:30	2
3			customers/profiles/S.jpg	t	2026-11-01 16:20:48.99271+05:30	2026-11-02 11:15:45.854378+05:30	3
5				t	2026-11-13 10:56:06.656654+05:30	2026-11-13 10:56:06.656665+05:30	46
6				t	2026-11-13 11:57:03.850287+05:30	2026-11-13 11:57:03.850304+05:30	47
8				t	2026-11-15 11:06:05.714961+05:30	2026-11-15 11:06:05.714975+05:30	49
7	7907899186			t	2026-11-14 16:07:38.312736+05:30	2026-11-14 16:07:38.31275+05:30	48
9	+91 98765 43210			t	2026-11-16 10:29:45.395929+05:30	2026-11-16 10:29:45.395941+05:30	50
10	9874563210			t	2026-11-16 10:55:46.496178+05:30	2026-11-16 10:55:46.496188+05:30	51
\.


--
-- Data for Name: app_favoriteartist; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_favoriteartist (id, created_at, artist_id, customer_id) FROM stdin;
2	2026-11-01 16:17:36.175769+05:30	17	40
\.


--
-- Data for Name: app_notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_notification (id, title, message, notification_type, is_read, created_at, user_id) FROM stdin;
1	Booking Cancelled	Booking for Stage Star Performer (Wedding Reception) was cancelled.	booking_update	t	2026-11-01 16:17:36.179789+05:30	40
2	Support Request: Audio requirements for acoustic performance	Your help request has been received. Our team will review and reply within 24 hours.	general	f	2026-11-01 16:17:36.18271+05:30	40
3	Password Changed	Your account password was updated successfully.	security	f	2026-11-01 16:17:37.063278+05:30	40
7	Booking Request Submitted	Your booking request for YesKey (Wedding) on Nov 15, 2026 has been sent.	booking_update	f	2026-11-03 10:53:48.481992+05:30	3
8	Booking Request Submitted	Your booking request for YesKey (Sangeet / Reception) on Nov 15, 2026 has been sent.	booking_update	f	2026-11-04 15:25:30.566361+05:30	3
9	New Booking Request Received	You received a new booking request from Shravan Kumar for Sangeet / Reception on Nov 15, 2026.	booking_update	f	2026-11-04 15:25:30.571363+05:30	2
10	Booking Request Accepted!	YesKey has accepted your booking for Sangeet / Reception on Nov 15, 2026.	booking_update	f	2026-11-04 15:27:28.896649+05:30	3
11	Booking Confirmed	You accepted the booking with Shravan Kumar for Sangeet / Reception.	booking_update	f	2026-11-04 15:27:28.900728+05:30	2
12	Booking Request Submitted	Your booking request for YesKey (College Event) on Nov 15, 2026 has been sent.	booking_update	f	2026-11-08 11:07:32.12767+05:30	3
13	New Booking Request Received	You received a new booking request from Shravan Kumar for College Event on Nov 15, 2026.	booking_update	f	2026-11-08 11:07:32.132993+05:30	2
14	Booking Request Accepted!	YesKey accepted your booking for College Event. Confirmed price: ₹6000.00, You can now proceed with payment.	booking_update	f	2026-11-11 09:20:01.309078+05:30	3
15	Booking Confirmed	You accepted the booking with Shravan Kumar.Confirmed price: ₹6000.00.	booking_update	f	2026-11-11 09:20:01.324728+05:30	2
16	Booking Request Submitted	Your booking request for YesKey (Corporate Event) on Nov 30, 2026 has been sent.	booking_update	f	2026-11-13 10:58:45.317965+05:30	46
17	New Booking Request Received	You received a new booking request from demo_rahul for Corporate Event on Nov 30, 2026.	booking_update	f	2026-11-13 10:58:45.322926+05:30	2
18	Booking Request Accepted!	YesKey accepted your booking for Corporate Event. Confirmed price: ₹5500.00, You can now proceed with payment.	booking_update	f	2026-11-13 11:01:38.706002+05:30	46
19	Booking Confirmed	You accepted the booking with demo_rahul.Confirmed price: ₹5500.00.	booking_update	f	2026-11-13 11:01:38.708248+05:30	2
20	Payment Successful	Your payment of ₹5500.00 for YesKey was successful.	payment	f	2026-11-13 11:03:21.997672+05:30	46
21	Booking Payment Received	Payment of ₹5500.00 was successfully received for booking #3.	payment	f	2026-11-13 11:03:22.000518+05:30	2
22	Booking Request Submitted	Your booking request for YesKey (College Event) on Dec 15, 2026 has been sent.	booking_update	f	2026-11-13 11:59:05.935256+05:30	47
23	New Booking Request Received	You received a new booking request from demo_maya for College Event on Dec 15, 2026.	booking_update	f	2026-11-13 11:59:05.93783+05:30	2
24	Booking Request Accepted!	YesKey accepted your booking for College Event. Confirmed price: ₹5350.00, You can now proceed with payment.	booking_update	f	2026-11-13 12:00:15.159237+05:30	47
25	Booking Confirmed	You accepted the booking with demo_maya.Confirmed price: ₹5350.00.	booking_update	f	2026-11-13 12:00:15.161911+05:30	2
26	Payment Successful	Your payment of ₹5350.00 for YesKey was successful.	payment	f	2026-11-13 12:01:42.773779+05:30	47
27	Booking Payment Received	Payment of ₹5350.00 was successfully received for booking #4.	payment	f	2026-11-13 12:01:42.775707+05:30	2
28	Booking Request Submitted	Your booking request for YesKey (Wedding Reception) on Jan 10, 2027 has been sent.	booking_update	f	2026-11-14 16:06:52.198037+05:30	48
29	New Booking Request Received	You received a new booking request from David007 for Wedding Reception on Jan 10, 2027.	booking_update	f	2026-11-14 16:06:52.211482+05:30	2
30	Booking Request Submitted	Your booking request for YesKey (Cocktail Party) on Jan 10, 2027 has been sent.	booking_update	f	2026-11-14 16:12:43.824453+05:30	49
31	New Booking Request Received	You received a new booking request from zombie99 for Cocktail Party on Jan 10, 2027.	booking_update	f	2026-11-14 16:12:43.828018+05:30	2
32	Booking Request Accepted!	YesKey accepted your booking for Wedding Reception. Confirmed price: ₹5500.00. Payment must be completed within 24 hours (by Nov 15, 2026 at 04:18 PM IST). You can now proceed with payment.	booking_update	f	2026-11-14 16:18:36.862871+05:30	48
33	Booking Confirmed	You accepted the booking with David007. Confirmed price: ₹5500.00. Payment deadline: Nov 15, 2026 at 04:18 PM IST.	booking_update	f	2026-11-14 16:18:36.866005+05:30	2
34	Booking Request Submitted	Your booking request for YesKey (Birthday Party) on Jan 25, 2027 has been sent.	booking_update	f	2026-11-14 16:24:27.507153+05:30	48
35	New Booking Request Received	You received a new booking request from David007 for Birthday Party on Jan 25, 2027.	booking_update	f	2026-11-14 16:24:27.511442+05:30	2
36	Booking Request Accepted!	YesKey accepted your booking for Birthday Party. Confirmed price: ₹6000.00. Payment must be completed within 24 hours (by Nov 15, 2026 at 04:28 PM IST). You can now proceed with payment.	booking_update	f	2026-11-14 16:28:24.403839+05:30	48
37	Booking Confirmed	You accepted the booking with David007. Confirmed price: ₹6000.00. Payment deadline: Nov 15, 2026 at 04:28 PM IST.	booking_update	f	2026-11-14 16:28:24.40639+05:30	2
38	Reservation Expired	Your reservation for YesKey on Nov 20, 2027 (Booking #8) has expired because payment was not completed within the 24-hour deadline. The reservation has been released.	booking_update	f	2026-11-15 09:21:10.028152+05:30	46
39	Date Released	The reservation for demo_rahul on Nov 20, 2027 (Booking #8) expired without payment. This calendar date is now available for new bookings.	booking_update	f	2026-11-15 09:21:10.032021+05:30	2
40	Refund Processed	A refund of ₹240.00 for YesKey (Booking #9) has been processed successfully via Razorpay.	payment	f	2026-11-15 10:01:42.015349+05:30	3
41	Booking Refunded	Payment for Booking #9 (Shravan Kumar) has been refunded to the customer.	payment	f	2026-11-15 10:01:42.017384+05:30	2
42	Booking Request Submitted	Your booking request for DJ Karan (Pulse Electronic) (College Event) on Nov 30, 2026 has been sent.	booking_update	f	2026-11-15 11:17:37.597408+05:30	48
43	New Booking Request Received	You received a new booking request from David007 for College Event on Nov 30, 2026.	booking_update	f	2026-11-15 11:17:37.600116+05:30	9
44	Booking Request Accepted!	DJ Karan (Pulse Electronic) accepted your booking for College Event. Confirmed price: ₹35000.00. Payment must be completed within 24 hours (by Nov 16, 2026 at 11:20 AM IST). You can now proceed with payment.	booking_update	f	2026-11-15 11:20:15.839115+05:30	48
45	Booking Confirmed	You accepted the booking with David007. Confirmed price: ₹35000.00. Payment deadline: Nov 16, 2026 at 11:20 AM IST.	booking_update	f	2026-11-15 11:20:15.84251+05:30	9
46	Payment Successful	Your payment of ₹35000.00 for DJ Karan (Pulse Electronic) was successful.	payment	f	2026-11-15 11:22:06.011933+05:30	48
47	Booking Payment Received	Payment of ₹35000.00 was successfully received for booking #10.	payment	f	2026-11-15 11:22:06.016255+05:30	9
48	Booking Request Submitted	Your booking request for Aarav Sharma & The Acoustic Waves (Music / Cultural Festival) on Nov 30, 2026 has been sent.	booking_update	f	2026-11-16 09:49:47.753818+05:30	48
49	New Booking Request Received	You received a new booking request from David007 for Music / Cultural Festival on Nov 30, 2026.	booking_update	f	2026-11-16 09:49:47.769432+05:30	7
50	Booking Request Accepted!	Aarav Sharma & The Acoustic Waves accepted your booking for Music / Cultural Festival. Confirmed price: ₹22000.00. Payment must be completed within 24 hours (by Nov 17, 2026 at 09:51 AM IST). You can now proceed with payment.	booking_update	f	2026-11-16 09:51:58.92583+05:30	48
51	Booking Confirmed	You accepted the booking with David007. Confirmed price: ₹22000.00. Payment deadline: Nov 17, 2026 at 09:51 AM IST.	booking_update	f	2026-11-16 09:51:58.929442+05:30	7
52	Payment Successful	Your payment of ₹22000.00 for Aarav Sharma & The Acoustic Waves was successful.	payment	f	2026-11-16 09:52:46.670224+05:30	48
53	Booking Payment Received	Payment of ₹22000.00 was successfully received for booking #11.	payment	f	2026-11-16 09:52:46.672289+05:30	7
54	Rescheduling Request Received	Customer David007 requested to reschedule Booking #11 from Nov 30, 2026 at 07:00 PM to Nov 29, 2026 at 07:00 PM. Reason: We need to change the event date due to a schedule change..	booking_update	f	2026-11-16 09:58:55.673801+05:30	7
55	Rescheduling Request Submitted	Your request to reschedule Booking #11 to Nov 29, 2026 at 07:00 PM has been submitted to Aarav Sharma & The Acoustic Waves.	booking_update	f	2026-11-16 09:58:55.676331+05:30	48
56	Rescheduling Request Approved!	Aarav Sharma & The Acoustic Waves approved your request to reschedule Booking #11. New event date: Nov 29, 2026 at 07:00 PM.	booking_update	f	2026-11-16 10:02:34.098524+05:30	48
57	Rescheduling Confirmed	You approved rescheduling for Booking #11 from Nov 30, 2026 at 07:00 PM to Nov 29, 2026 at 07:00 PM.	booking_update	f	2026-11-16 10:02:34.100247+05:30	7
60	Booking Request Submitted	Your booking request for The Royal Symphony Strings (Sangeet / Reception) on Dec 10, 2026 has been sent.	booking_update	f	2026-11-16 10:55:46.499625+05:30	51
61	New Booking Request Received	You received a new booking request from Amit_das for Sangeet / Reception on Dec 10, 2026.	booking_update	f	2026-11-16 10:55:46.502179+05:30	10
62	Booking Request Accepted!	The Royal Symphony Strings accepted your booking for Sangeet / Reception. Confirmed price: ₹55000.00. Payment must be completed within 24 hours (by Nov 17, 2026 at 10:56 AM IST). You can now proceed with payment.	booking_update	f	2026-11-16 10:56:14.332755+05:30	51
63	Booking Confirmed	You accepted the booking with Amit_das. Confirmed price: ₹55000.00. Payment deadline: Nov 17, 2026 at 10:56 AM IST.	booking_update	f	2026-11-16 10:56:14.334756+05:30	10
64	Payment Successful	Your payment of ₹55000.00 for The Royal Symphony Strings was successful.	payment	f	2026-11-16 10:56:53.108089+05:30	51
65	Booking Payment Received	Payment of ₹55000.00 was successfully received for booking #13.	payment	f	2026-11-16 10:56:53.109785+05:30	10
66	Refund Processed	A refund of ₹55000.00 for The Royal Symphony Strings (Booking #13) has been processed successfully via Razorpay.	payment	f	2026-11-16 10:58:51.510311+05:30	51
67	Booking Refunded	Payment for Booking #13 (Amit_das) has been refunded to the customer.	payment	f	2026-11-16 10:58:51.511885+05:30	10
68	Booking Cancelled	Your booking #13 with The Royal Symphony Strings was cancelled. Policy: Customer cancellation > 7 days before event (100% refund). A refund of ₹55000.00 has been initiated.	booking_update	f	2026-11-16 10:58:51.516277+05:30	51
69	Booking Cancelled by Customer	Booking #13 (Sangeet / Reception) was cancelled by the customer.	booking_update	f	2026-11-16 10:58:51.517939+05:30	10
70	Booking Request Submitted	Your booking request for The Royal Symphony Strings (Corporate Event) on Nov 20, 2026 has been sent.	booking_update	f	2026-11-16 11:04:50.859572+05:30	51
71	New Booking Request Received	You received a new booking request from Amit_das for Corporate Event on Nov 20, 2026.	booking_update	f	2026-11-16 11:04:50.863394+05:30	10
72	Booking Request Accepted!	The Royal Symphony Strings accepted your booking for Corporate Event. Confirmed price: ₹55000.00. Payment must be completed within 24 hours (by Nov 17, 2026 at 11:05 AM IST). You can now proceed with payment.	booking_update	f	2026-11-16 11:05:13.229164+05:30	51
73	Booking Confirmed	You accepted the booking with Amit_das. Confirmed price: ₹55000.00. Payment deadline: Nov 17, 2026 at 11:05 AM IST.	booking_update	f	2026-11-16 11:05:13.231089+05:30	10
74	Booking Payment Received	Payment of ₹55000.00 was successfully received for booking #14.	payment	f	2026-11-16 11:05:58.611071+05:30	10
75	Refund Processed	A refund of ₹27500.00 for The Royal Symphony Strings (Booking #14) has been processed successfully via Razorpay.	payment	f	2026-11-16 11:06:44.595414+05:30	51
76	Booking Refunded	Payment for Booking #14 (Amit_das) has been refunded to the customer.	payment	f	2026-11-16 11:06:44.59778+05:30	10
77	Booking Cancelled	Your booking #14 with The Royal Symphony Strings was cancelled. Policy: Customer cancellation 3–7 days before event (50% refund). A refund of ₹27500.00 has been initiated.	booking_update	f	2026-11-16 11:06:44.605068+05:30	51
78	Booking Cancelled by Customer	Booking #14 (Corporate Event) was cancelled by the customer. Retained artist compensation: ₹25300.00.	booking_update	f	2026-11-16 11:06:44.607161+05:30	10
79	Booking Request Submitted	Your booking request for The Royal Symphony Strings (Private Party / Birthday) on Nov 18, 2026 has been sent.	booking_update	f	2026-11-16 14:52:18.199785+05:30	51
80	New Booking Request Received	You received a new booking request from Amit_das for Private Party / Birthday on Nov 18, 2026.	booking_update	f	2026-11-16 14:52:18.217397+05:30	10
81	Booking Request Accepted!	The Royal Symphony Strings accepted your booking for Private Party / Birthday. Confirmed price: ₹55000.00. Payment must be completed within 24 hours (by Nov 17, 2026 at 02:52 PM IST). You can now proceed with payment.	booking_update	f	2026-11-16 14:52:44.911133+05:30	51
82	Booking Confirmed	You accepted the booking with Amit_das. Confirmed price: ₹55000.00. Payment deadline: Nov 17, 2026 at 02:52 PM IST.	booking_update	f	2026-11-16 14:52:44.912721+05:30	10
83	Booking Payment Received	Payment of ₹55000.00 was successfully received for booking #15.	payment	f	2026-11-16 14:53:16.191796+05:30	10
84	Booking Cancelled	Your booking #15 with The Royal Symphony Strings was cancelled. As per policy (Customer cancellation < 3 days before event (0% refund)), refund amount is ₹0.00.	booking_update	f	2026-11-16 14:57:28.575803+05:30	51
85	Booking Cancelled by Customer	Booking #15 (Private Party / Birthday) was cancelled by the customer. Retained artist compensation: ₹50600.00.	booking_update	f	2026-11-16 14:57:28.577865+05:30	10
86	Booking Request Submitted	Your booking request for DJ Karan (Pulse Electronic) (College Event) on Nov 28, 2026 has been sent.	booking_update	f	2026-11-16 14:59:27.275259+05:30	51
87	New Booking Request Received	You received a new booking request from Amit_das for College Event on Nov 28, 2026.	booking_update	f	2026-11-16 14:59:27.277669+05:30	9
88	Booking Request Accepted!	DJ Karan (Pulse Electronic) accepted your booking for College Event. Confirmed price: ₹35000.00. Payment must be completed within 24 hours (by Nov 17, 2026 at 03:01 PM IST). You can now proceed with payment.	booking_update	f	2026-11-16 15:01:11.939588+05:30	51
89	Booking Confirmed	You accepted the booking with Amit_das. Confirmed price: ₹35000.00. Payment deadline: Nov 17, 2026 at 03:01 PM IST.	booking_update	f	2026-11-16 15:01:11.941147+05:30	9
90	Payment Successful	Your payment of ₹35000.00 for DJ Karan (Pulse Electronic) was successful.	payment	f	2026-11-16 15:01:41.262998+05:30	51
91	Booking Payment Received	Payment of ₹35000.00 was successfully received for booking #16.	payment	f	2026-11-16 15:01:41.274643+05:30	9
92	Refund Processed	A refund of ₹35000.00 for DJ Karan (Pulse Electronic) (Booking #16) has been processed successfully via Razorpay.	payment	f	2026-11-16 15:03:34.672578+05:30	51
93	Booking Refunded	Payment for Booking #16 (Amit_das) has been refunded to the customer.	payment	f	2026-11-16 15:03:34.674543+05:30	9
94	Booking Cancelled by Artist	Artist DJ Karan (Pulse Electronic) has cancelled your booking #16 (College Event). Reason: Artist unavailable due to an emergency.. A full refund of ₹35000.00 has been initiated.	booking_update	f	2026-11-16 15:03:34.679833+05:30	51
95	Booking Cancelled	You cancelled booking #16 with Amit_das. Full refund of ₹35000.00 initiated.	booking_update	f	2026-11-16 15:03:34.681495+05:30	9
96	Booking Request Submitted	Your booking request for DJ Karan (Pulse Electronic) (Wedding) on Nov 25, 2026 has been sent.	booking_update	f	2026-11-17 10:11:00.142376+05:30	51
97	New Booking Request Received	You received a new booking request from Amit_das for Wedding on Nov 25, 2026.	booking_update	f	2026-11-17 10:11:00.158592+05:30	9
98	Booking Request Accepted!	DJ Karan (Pulse Electronic) accepted your booking for Wedding. Confirmed price: ₹35000.00. Payment must be completed within 24 hours (by Nov 18, 2026 at 10:11 AM IST). You can now proceed with payment.	booking_update	f	2026-11-17 10:11:20.901303+05:30	51
99	Booking Confirmed	You accepted the booking with Amit_das. Confirmed price: ₹35000.00. Payment deadline: Nov 18, 2026 at 10:11 AM IST.	booking_update	f	2026-11-17 10:11:20.905825+05:30	9
100	Reservation Expired	Your reservation for DJ Karan (Pulse Electronic) on Nov 25, 2026 (Booking #17) has expired because payment was not completed within the 24-hour deadline. The reservation has been released.	booking_update	f	2026-11-17 10:13:55.639683+05:30	51
101	Date Released	The reservation for Amit_das on Nov 25, 2026 (Booking #17) expired without payment. This calendar date is now available for new bookings.	booking_update	f	2026-11-17 10:13:55.642546+05:30	9
102	Booking Request Submitted	Your booking request for DJ Karan (Pulse Electronic) (College Event) on Nov 25, 2026 has been sent.	booking_update	f	2026-11-17 10:16:47.32846+05:30	51
103	New Booking Request Received	You received a new booking request from Amit_das for College Event on Nov 25, 2026.	booking_update	f	2026-11-17 10:16:47.331173+05:30	9
104	Booking Request Submitted	Your booking request for DJ Karan (Pulse Electronic) (Music / Cultural Festival) on Nov 25, 2026 has been sent.	booking_update	f	2026-11-17 10:17:35.726722+05:30	48
105	New Booking Request Received	You received a new booking request from David007 for Music / Cultural Festival on Nov 25, 2026.	booking_update	f	2026-11-17 10:17:35.729579+05:30	9
106	Booking Request Accepted!	DJ Karan (Pulse Electronic) accepted your booking for College Event. Confirmed price: ₹35600.00. Payment must be completed within 24 hours (by Nov 18, 2026 at 10:18 AM IST). You can now proceed with payment.	booking_update	f	2026-11-17 10:18:41.565345+05:30	51
107	Booking Confirmed	You accepted the booking with Amit_das. Confirmed price: ₹35600.00. Payment deadline: Nov 18, 2026 at 10:18 AM IST.	booking_update	f	2026-11-17 10:18:41.567373+05:30	9
\.


--
-- Data for Name: app_payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_payment (id, amount, transaction_id, status, created_at, booking_id, artist_amount, commission_amount, commission_percentage, razorpay_order_id, updated_at) FROM stdin;
2	6000.00	pay_TymB01BD42WYkW	success	2026-11-08 11:07:32.118441+05:30	2	5520.00	480.00	8.00	order_Tym99QY8uZo9gT	2026-11-13 10:21:23.419827+05:30
3	5500.00	pay_TzXsl1Nqj34z6s	success	2026-11-13 10:58:45.312507+05:30	3	5060.00	440.00	8.00	order_TzXrymKUHNOiOI	2026-11-13 11:03:21.994304+05:30
4	5350.00	pay_TzYsUY0sHd7sS9	success	2026-11-13 11:59:05.931294+05:30	4	4922.00	428.00	8.00	order_TzYrmf0fuDytjf	2026-11-13 12:01:42.767874+05:30
6	0.00	\N	pending	2026-11-14 16:12:43.821163+05:30	6	0.00	0.00	8.00	\N	2026-11-14 16:12:43.821172+05:30
5	5500.00	\N	pending	2026-11-14 16:06:52.181243+05:30	5	5060.00	440.00	8.00	\N	2026-11-14 16:18:36.861668+05:30
7	6000.00	\N	pending	2026-11-14 16:24:27.504348+05:30	7	5520.00	480.00	8.00	\N	2026-11-14 16:28:24.402048+05:30
8	25000.00	\N	failed	2026-11-15 09:21:02.084677+05:30	8	23000.00	2000.00	8.00	\N	2026-11-15 09:21:10.013454+05:30
9	240.00	pay_ToSA9Jr8Jet4iS	refunded	2026-11-15 10:01:40.283364+05:30	9	220.80	19.20	8.00	order_ToS9rpIShvKdTh	2026-11-15 10:01:58.524487+05:30
10	35000.00	pay_U0LGsi3BfeaJjs	success	2026-11-15 11:17:37.59001+05:30	10	32200.00	2800.00	8.00	order_U0LGfZkBw02mOH	2026-11-15 11:22:06.004924+05:30
11	22000.00	pay_U0iHfZFjlmi7u8	success	2026-11-16 09:49:47.746281+05:30	11	20240.00	1760.00	8.00	order_U0iHOwtRiqwewb	2026-11-16 09:52:46.664181+05:30
13	55000.00	pay_U0jNOHTr1n95hH	refunded	2026-11-16 10:55:46.492442+05:30	13	50600.00	4400.00	8.00	order_U0jNDFbI2L7OSc	2026-11-16 10:58:51.502266+05:30
14	55000.00	pay_U0jWz7BLzmT5eH	refunded	2026-11-16 11:04:50.852513+05:30	14	50600.00	4400.00	8.00	order_U0jWtb7JoilcX1	2026-11-16 11:06:44.573123+05:30
15	55000.00	pay_U0nP5Bh1ao6FKh	success	2026-11-16 14:52:18.192099+05:30	15	50600.00	4400.00	8.00	order_U0nOxv4pbCYBFi	2026-11-16 14:53:16.185355+05:30
16	35000.00	pay_U0nXya0iFQw5BO	refunded	2026-11-16 14:59:27.269925+05:30	16	32200.00	2800.00	8.00	order_U0nXtiyHUw9je4	2026-11-16 15:03:34.663712+05:30
17	35000.00	\N	failed	2026-11-17 10:11:00.133595+05:30	17	32200.00	2800.00	8.00	\N	2026-11-17 10:13:55.630839+05:30
19	0.00	\N	pending	2026-11-17 10:17:35.721221+05:30	19	0.00	0.00	8.00	\N	2026-11-17 10:17:35.721231+05:30
18	35600.00	\N	pending	2026-11-17 10:16:47.323345+05:30	18	32752.00	2848.00	8.00	\N	2026-11-17 10:18:41.564239+05:30
\.


--
-- Data for Name: app_portfolio; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_portfolio (id, title, description, media_url, uploaded_at, artist_id) FROM stdin;
1	Live Event Highlights - Aarav Sharma & The Acoustic Waves	Recorded live during summer stadium festival tour.	https://www.youtube.com/watch?v=sample1	2026-11-01 09:23:10.692886+05:30	5
2	Live Event Highlights - Urban Bounce Dance Troupe	Recorded live during summer stadium festival tour.	https://www.youtube.com/watch?v=sample2	2026-11-01 09:23:11.118489+05:30	6
3	Live Event Highlights - DJ Karan (Pulse Electronic)	Recorded live during summer stadium festival tour.	https://soundcloud.com/sample3	2026-11-01 09:23:11.561787+05:30	7
4	Live Event Highlights - The Royal Symphony Strings	Recorded live during summer stadium festival tour.	https://www.youtube.com/watch?v=sample4	2026-11-01 09:23:11.980012+05:30	8
5	Live Event Highlights - Neha Kapoor (Celebrity Emcee)	Recorded live during summer stadium festival tour.	https://www.youtube.com/watch?v=sample5	2026-11-01 09:23:12.407458+05:30	9
6	Live Event Highlights - Malhar Rock & Sufi Ensemble	Recorded live during summer stadium festival tour.	https://www.youtube.com/watch?v=sample6	2026-11-01 09:23:12.83199+05:30	10
\.


--
-- Data for Name: app_processedwebhookevent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_processedwebhookevent (id, event_id, event_type, payload_hash, processed_at) FROM stdin;
1	evt_live_rfnd_test_101	refund.processed		2026-11-15 10:01:58.549108+05:30
\.


--
-- Data for Name: app_refund; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_refund (id, razorpay_refund_id, amount, currency, status, reason, failure_reason, idempotency_key, created_at, updated_at, booking_id, payment_id) FROM stdin;
1	rfnd_U0JuEhZnCl8UKi	240.00	INR	processed	Phase 5 Safe Integration Test Refund		rfnd_pay_ToSA9Jr8Jet4iS_24000	2026-11-15 10:01:40.293819+05:30	2026-11-15 10:01:58.522955+05:30	9	9
2	rfnd_U0jPjS03JEuBqE	55000.00	INR	processed	Customer cancelled booking #13: Schedule change.		rfnd_cancel_pay_U0jNOHTr1n95hH_5500000	2026-11-16 10:58:49.791614+05:30	2026-11-16 10:58:51.512385+05:30	13	13
3	rfnd_U0jY3qnYcY422b	27500.00	INR	processed	Customer cancelled booking #14: Schedule change		rfnd_cancel_pay_U0jWz7BLzmT5eH_2750000	2026-11-16 11:06:42.859979+05:30	2026-11-16 11:06:44.598394+05:30	14	14
4	rfnd_U0naEUILxMFDdk	35000.00	INR	processed	Artist cancelled booking #16: Artist unavailable due to an emergency.		rfnd_artist_cancel_pay_U0nXya0iFQw5BO_3500000	2026-11-16 15:03:32.461563+05:30	2026-11-16 15:03:34.657334+05:30	16	16
\.


--
-- Data for Name: app_reschedulingrequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_reschedulingrequest (id, original_event_date, new_event_date, reason, artist_response, status, requested_at, responded_at, artist_id, booking_id, customer_id) FROM stdin;
1	2026-11-30 19:00:00+05:30	2026-11-29 19:00:00+05:30	We need to change the event date due to a schedule change.	Approved by artist	approved	2026-11-16 09:58:55.664495+05:30	2026-11-16 10:02:34.094126+05:30	5	11	48
\.


--
-- Data for Name: app_review; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_review (id, rating, comment, created_at, artist_id, booking_id, customer_id) FROM stdin;
\.


--
-- Data for Name: auth_group; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auth_group (id, name) FROM stdin;
\.


--
-- Data for Name: auth_group_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auth_group_permissions (id, group_id, permission_id) FROM stdin;
\.


--
-- Data for Name: auth_permission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auth_permission (id, name, content_type_id, codename) FROM stdin;
1	Can add log entry	1	add_logentry
2	Can change log entry	1	change_logentry
3	Can delete log entry	1	delete_logentry
4	Can view log entry	1	view_logentry
5	Can add permission	3	add_permission
6	Can change permission	3	change_permission
7	Can delete permission	3	delete_permission
8	Can view permission	3	view_permission
9	Can add group	2	add_group
10	Can change group	2	change_group
11	Can delete group	2	delete_group
12	Can view group	2	view_group
13	Can add user	4	add_user
14	Can change user	4	change_user
15	Can delete user	4	delete_user
16	Can view user	4	view_user
17	Can add content type	5	add_contenttype
18	Can change content type	5	change_contenttype
19	Can delete content type	5	delete_contenttype
20	Can view content type	5	view_contenttype
21	Can add session	6	add_session
22	Can change session	6	change_session
23	Can delete session	6	delete_session
24	Can view session	6	view_session
25	Can add artist	7	add_artist
26	Can change artist	7	change_artist
27	Can delete artist	7	delete_artist
28	Can view artist	7	view_artist
29	Can add booking	8	add_booking
30	Can change booking	8	change_booking
31	Can delete booking	8	delete_booking
32	Can view booking	8	view_booking
33	Can add artist profile	9	add_artistprofile
34	Can change artist profile	9	change_artistprofile
35	Can delete artist profile	9	delete_artistprofile
36	Can view artist profile	9	view_artistprofile
37	Can add category	10	add_category
38	Can change category	10	change_category
39	Can delete category	10	delete_category
40	Can view category	10	view_category
41	Can add payment	11	add_payment
42	Can change payment	11	change_payment
43	Can delete payment	11	delete_payment
44	Can view payment	11	view_payment
45	Can add portfolio	12	add_portfolio
46	Can change portfolio	12	change_portfolio
47	Can delete portfolio	12	delete_portfolio
48	Can view portfolio	12	view_portfolio
49	Can add review	13	add_review
50	Can change review	13	change_review
51	Can delete review	13	delete_review
52	Can view review	13	view_review
53	Can add notification	16	add_notification
54	Can change notification	16	change_notification
55	Can delete notification	16	delete_notification
56	Can view notification	16	view_notification
57	Can add favorite artist	15	add_favoriteartist
58	Can change favorite artist	15	change_favoriteartist
59	Can delete favorite artist	15	delete_favoriteartist
60	Can view favorite artist	15	view_favoriteartist
61	Can add customer profile	14	add_customerprofile
62	Can change customer profile	14	change_customerprofile
63	Can delete customer profile	14	delete_customerprofile
64	Can view customer profile	14	view_customerprofile
65	Can add artist availability	17	add_artistavailability
66	Can change artist availability	17	change_artistavailability
67	Can delete artist availability	17	delete_artistavailability
68	Can view artist availability	17	view_artistavailability
69	Can add processed webhook event	18	add_processedwebhookevent
70	Can change processed webhook event	18	change_processedwebhookevent
71	Can delete processed webhook event	18	delete_processedwebhookevent
72	Can view processed webhook event	18	view_processedwebhookevent
73	Can add refund	19	add_refund
74	Can change refund	19	change_refund
75	Can delete refund	19	delete_refund
76	Can view refund	19	view_refund
77	Can add booking cancellation	20	add_bookingcancellation
78	Can change booking cancellation	20	change_bookingcancellation
79	Can delete booking cancellation	20	delete_bookingcancellation
80	Can view booking cancellation	20	view_bookingcancellation
81	Can add rescheduling request	21	add_reschedulingrequest
82	Can change rescheduling request	21	change_reschedulingrequest
83	Can delete rescheduling request	21	delete_reschedulingrequest
84	Can view rescheduling request	21	view_reschedulingrequest
\.


--
-- Data for Name: auth_user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auth_user (id, password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined) FROM stdin;
11	pbkdf2_sha256$1500000$m9IP3lusbJIqt9czO7WyCK$qDYgXqefRoCkRzhjo2nztctrOz18SwEpicx0FRvO2xY=	\N	f	neha_anchor_host			neha.emcee@example.com	f	t	2026-11-01 09:23:11.982241+05:30
12	pbkdf2_sha256$1500000$Qu5S7H7r4y4nhJ1Vb1XZdJ$T+OYiQwMYqSE8XI5etDPwjnm9YZNapD7+6XgJ+x738I=	\N	f	malhar_fusion_band			malhar.band@example.com	f	t	2026-11-01 09:23:12.410812+05:30
50	pbkdf2_sha256$1500000$Y28pqT6CAEekXGEjfSj0gf$0AfkzBdQcdaC33D+Quge+Tuvu2ZIOibGeVHRcGh2IpI=	2026-11-16 10:32:04.07823+05:30	f	test_customer			test_customer@example.com	f	t	2026-11-16 10:29:44.930074+05:30
47	pbkdf2_sha256$1500000$EJfLJhFTntBl0uiHkYg6rR$VYHNSVBavmj23i3wFDVnnELX82mvoqPnG8LOVsW8tmY=	2026-11-13 11:57:03.762647+05:30	f	demo_maya			mayademo@gmail.com	f	t	2026-11-13 11:57:03.323576+05:30
40	pbkdf2_sha256$1500000$0knftyHBgJmOHCy3hJ4pMT$QGyNws+LHzgagOizlPvVjZy6V1sNWbBH5xXWh+hnMgk=	\N	f	cd_test_customer	UpdatedAlex	UpdatedJohnson	cd_test_customer@example.com	f	f	2026-11-01 16:17:35.713865+05:30
42	!Tnk1IhVnuWkUXs49IzwgWendHBeh7W1fmjwAAuEq	2026-11-01 16:18:40.332002+05:30	f	testgooglecustomer	Google	Customer	testgooglecustomer@example.com	f	t	2026-11-01 16:18:40.324392+05:30
43	!Mlp5PAoX39paDZlMlBogmtkzB4hBeR9aqzq4pDLo	2026-11-01 16:18:40.346221+05:30	f	testgoogleartist	Stage	Performer	testgoogleartist@example.com	f	t	2026-11-01 16:18:40.343815+05:30
31	!h6wTWbBI0WgiCzTUqBIu9vBHWrF6fKafNXjUJJq1	2026-11-01 16:18:40.35268+05:30	f	skewtest			skewtest@example.com	f	t	2026-11-01 10:55:29.20688+05:30
3	!UeML9kKdcoCqHWvWyAVYVe3ttKGbdiIVFU2Jlfya	2026-11-14 09:32:37.314796+05:30	f	shr	Shravan	Kumar	shravank.7907@gmail.com	f	t	2026-10-23 15:13:11.107884+05:30
1	pbkdf2_sha256$1500000$wM6EfFK1UXkWzQMbrx6bVY$4P++0axd2iMzPUVg8TMgwz2C3GUwqgEY+rSHGzzqbYI=	2026-11-01 09:08:13.373245+05:30	t	shra1				t	t	2026-10-21 10:00:06.226011+05:30
8	pbkdf2_sha256$1500000$nOCPGDoln2UgfP4axMUvXC$JyD96RoB6KoLTqlgj0Anr3f9hSS3UiLziT87PtW5m9o=	\N	f	urban_bounce_crew			urbanbounce@example.com	f	t	2026-11-01 09:23:10.698578+05:30
51	pbkdf2_sha256$1500000$ReeZAkUWxBC4QAwyVKOEkg$zlI1TNieN6FIgrd2HRMoouAZV7VmyOqzlPOIoOPSiYM=	2026-11-16 10:53:10.652427+05:30	f	Amit_das			amitdas@gmail.com	f	t	2026-11-16 10:50:23.077985+05:30
10	pbkdf2_sha256$1500000$0pRYeVpd3pv4UYeWkKDKhk$3aB53Rxkiqc05U75OhFQgpt4QLBFFJpuveyyQP7TubI=	2026-11-16 14:51:29.32865+05:30	f	strings_of_harmony			strings.harmony@example.com	f	t	2026-11-01 09:23:11.563944+05:30
9	pbkdf2_sha256$1500000$WE5c8Jd3jUySaTzcCaA3yi$3bqq4rupQUShLiqFtrW4momHbrqaT+3glpC71Ndzg2k=	2026-11-17 10:10:17.621832+05:30	f	dj_karan_pulse			karan.dj@example.com	f	t	2026-11-01 09:23:11.120551+05:30
48	pbkdf2_sha256$1500000$FKzCRvaUlBybgWGoHfaavb$nLps3HFd9Sbk9278fnEIhrTqVLs6SmRauwFV8W15kFg=	2026-11-17 10:17:10.646057+05:30	f	David007			david67@gmail.com	f	t	2026-11-14 15:27:25.872726+05:30
2	pbkdf2_sha256$1500000$38M6qgAXWGvwRYfaMb7ug4$zkSA9w4ygG+fbyFDEFroJMnl1JUgfshm30GT8FbX634=	2026-11-18 09:00:56.167428+05:30	f	ShravanK7			shravankumar7907@gmail.com	f	t	2026-10-22 15:47:34.066766+05:30
39		\N	f	cd_test_artist	Stage	Star	cd_test_artist@example.com	f	t	2026-11-01 16:16:43.633183+05:30
49	pbkdf2_sha256$1500000$VuN3Fl0Ek4UZJihzL9vYD0$aQTgBwH+jRe53x9FlSSqEdBXliU4QQHyfS68GfI0BaA=	2026-11-14 16:10:41.801948+05:30	f	zombie99			iamazombie@gmail.com	f	t	2026-11-14 16:09:30.698704+05:30
7	pbkdf2_sha256$1500000$rVvzLBdnvkarFEruUFLbKL$x/7WquKhDOCQ9TGjKU5ZLnLjE2xL2mZts9ZGL+zo7cI=	2026-11-16 09:48:31.239966+05:30	f	aarav_vocalist			aarav.singer@example.com	f	t	2026-11-01 09:23:10.247885+05:30
46	pbkdf2_sha256$1500000$vblyznOrkeVf1z1rwK7TBN$5LY++0qLSuTPva7X9iwf7yijcIJN1tXEJly2TxHC6/g=	2026-11-13 10:56:06.55017+05:30	f	demo_rahul			rahuldemo2026@gmail.com	f	t	2026-11-13 10:56:06.117678+05:30
\.


--
-- Data for Name: auth_user_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auth_user_groups (id, user_id, group_id) FROM stdin;
\.


--
-- Data for Name: auth_user_user_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auth_user_user_permissions (id, user_id, permission_id) FROM stdin;
\.


--
-- Data for Name: django_admin_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.django_admin_log (id, action_time, object_id, object_repr, action_flag, change_message, content_type_id, user_id) FROM stdin;
1	2026-10-21 10:01:01.519661+05:30	1	Shravan	1	[{"added": {}}]	7	1
\.


--
-- Data for Name: django_content_type; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.django_content_type (id, app_label, model) FROM stdin;
1	admin	logentry
2	auth	group
3	auth	permission
4	auth	user
5	contenttypes	contenttype
6	sessions	session
7	app	artist
8	app	booking
9	app	artistprofile
10	app	category
11	app	payment
12	app	portfolio
13	app	review
14	app	customerprofile
15	app	favoriteartist
16	app	notification
17	app	artistavailability
18	app	processedwebhookevent
19	app	refund
20	app	bookingcancellation
21	app	reschedulingrequest
\.


--
-- Data for Name: django_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.django_migrations (id, app, name, applied) FROM stdin;
1	contenttypes	0001_initial	2026-10-19 10:26:18.786111+05:30
2	auth	0001_initial	2026-10-19 10:26:18.87644+05:30
3	admin	0001_initial	2026-10-19 10:26:18.900126+05:30
4	admin	0002_logentry_remove_auto_add	2026-10-19 10:26:18.905711+05:30
5	admin	0003_logentry_add_action_flag_choices	2026-10-19 10:26:18.911275+05:30
6	contenttypes	0002_remove_content_type_name	2026-10-19 10:26:18.927072+05:30
7	auth	0002_alter_permission_name_max_length	2026-10-19 10:26:18.935423+05:30
8	auth	0003_alter_user_email_max_length	2026-10-19 10:26:18.943748+05:30
9	auth	0004_alter_user_username_opts	2026-10-19 10:26:18.951121+05:30
10	auth	0005_alter_user_last_login_null	2026-10-19 10:26:18.959615+05:30
11	auth	0006_require_contenttypes_0002	2026-10-19 10:26:18.960719+05:30
12	auth	0007_alter_validators_add_error_messages	2026-10-19 10:26:18.967722+05:30
13	auth	0008_alter_user_username_max_length	2026-10-19 10:26:18.979509+05:30
14	auth	0009_alter_user_last_name_max_length	2026-10-19 10:26:18.987814+05:30
15	auth	0010_alter_group_name_max_length	2026-10-19 10:26:18.995139+05:30
16	auth	0011_update_proxy_permissions	2026-10-19 10:26:19.00144+05:30
17	auth	0012_alter_user_first_name_max_length	2026-10-19 10:26:19.009226+05:30
18	sessions	0001_initial	2026-10-19 10:26:19.020766+05:30
19	app	0001_initial	2026-10-21 09:48:01.364826+05:30
20	app	0002_rename_artists_artist	2026-10-21 09:50:22.790362+05:30
22	app	0003_artistprofile_booking_category_payment_portfolio_and_more	2026-10-29 11:14:23.544386+05:30
23	app	0004_artistprofile_additional_information_and_more	2026-10-29 11:46:24.112621+05:30
24	app	0005_seed_categories	2026-10-29 15:16:49.887046+05:30
25	app	0006_artistprofile_gender	2026-11-01 10:13:49.150402+05:30
26	app	0007_alter_artistprofile_gender	2026-11-01 10:26:33.0731+05:30
27	app	0008_customerprofile_notification_favoriteartist	2026-11-01 16:06:37.519963+05:30
28	app	0009_booking_response_message_artistavailability	2026-11-02 18:12:11.323586+05:30
29	app	0010_booking_expected_audience_size_and_more	2026-11-04 10:21:56.05864+05:30
30	app	0011_payment_artist_amount_payment_commission_amount_and_more	2026-11-04 15:16:20.876313+05:30
31	app	0012_booking_customer_budget	2026-11-08 09:58:08.94259+05:30
32	app	0013_booking_customer_phone	2026-11-14 09:27:03.933289+05:30
33	app	0014_booking_accepted_at	2026-11-14 15:47:34.301467+05:30
34	app	0015_alter_booking_status	2026-11-15 09:04:05.230626+05:30
35	app	0016_processedwebhookevent_refund	2026-11-15 09:38:08.085234+05:30
36	app	0017_bookingcancellation_reschedulingrequest	2026-11-15 10:14:35.739012+05:30
37	app	0018_alter_payment_status_partially_refunded	2026-11-16 14:32:57.796514+05:30
38	app	0019_alter_booking_status_unavailable	2026-11-17 10:44:57.097788+05:30
\.


--
-- Data for Name: django_session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.django_session (session_key, session_data, expire_date) FROM stdin;
mva9hoghwwdt89mxo7ycpy4uulmhjok7	.eJxVjEEOwiAQAP-yZ0PYUij06N03EJYFqRpISnsy_t006UGvM5N5gw_7Vvze0-oXhhkQLr-MQnymegh-hHpvIra6rQuJIxGn7eLWOL2uZ_s3KKEXmGEkPTANU2ZpbbIxK20UIqoQbWanI-pxcgYNZ5kToXSkWRE7hVoqCvD5AuAuN8s:1xJNy9:41MjjuSdNsOCXjHDY0cLqlRIk1A2AcNayilJtf7khhs	2026-11-04 10:00:29.852305+05:30
r4zdcx5zi1ivg01gk3bnmfgt6smkwlxw	.eJxVjDkOwjAQAP-yNbIcX5ukpOcN1vpYHEC2FCcV4u8oUgpoZ0bzBk_7Vvze8-qXBDMgXH5ZoPjM9RDpQfXeRGx1W5cgjkSctotbS_l1Pdu_QaFeYAZNQ2KDkRXqiGNwShsiRiUdWkwmW-XGZI20EylmidJEzIiSBseTCfD5AtgCN1A:1xNMdt:zz5RYqnIpds9ipkhNDNADH0w5WrgP9vMGNKndlljXMU	2026-11-15 09:24:01.447048+05:30
kn1ty3o740vs4lb8c8xvepmtv48y4qdu	.eJxVjMsOgjAQAP9lz6bZvuiWo3e_oVm6xaIGEgon478bEg56nZnMGxLvW017K2uaBHrQFi6_cOD8LPNh5MHzfVF5mbd1GtSRqNM2dVukvK5n-zeo3Cr0QA6RCgYvminImEl79kbEB0RH2SNmYh4Rs3TkYzRGjyLWxs46QwN8vux0Nz8:1xNMl6:EQ17i4X5Xx7KOON5UC3Gm9NeydF03Pv6Jq1XTIAuIo8	2026-11-15 09:31:28.680312+05:30
pb1pkftro8m9ptyt4tua6pvczxvono1v	.eJxVjMsKwyAQAP9lz0VcrSvm2Hu_QXxtTVsUYnIK_fcSyKG9zgyzgw_bWv02yuLnDBOghssvjCG9SjtMfob26CL1ti5zFEciTjvEvefyvp3t36CGUWECFdix5KQ1GWZCdbWqmBgNFTTsHFlrULmCJpG1yiIxSSanOGCUUsPnC_etNyc:1xNMlS:XJR0rn_AVrWINom8ONIaiYnrrI5_R2wVWTWDbOLwS8E	2026-11-15 09:31:50.396515+05:30
8c3hea9wl4biz9ly5iqlge8og16ujb1k	.eJxVjLsOwjAMAP_FM4rikBcd2fmGyI5TUkCp1LQT4t9RpQ6w3p3uDYm2taatlyVNAgOgg9MvZMrP0nYjD2r3WeW5rcvEak_UYbu6zVJe16P9G1TqFQZgjojaBmEtTDqQcRSs0Z5yYcwjU8nGj9oIR49RDHrWli7O05kkC3y-Iaw48A:1xNN0A:bDaGiIMBQlqpwo8Vd05bQ4Xs7e80PQq7wXqLpcis7Ok	2026-11-15 09:47:02.04258+05:30
v210ynpuk3k3n02xm1wmtbiu4pbh1tjm	.eJxVjDkOwjAQAP-yNbJiGx9JSZ83WLvrNQ6gWMpRIf6OIqWAdmY0b0i4bzXtqyxpyjCADnD5hYT8lPkw-YHzvSlu87ZMpI5EnXZVY8vyup3t36DiWmEAuWrRrjNoxNgQXES2vRBKISviInsfO86ZjHdsSskUGD1plqCd7zV8viHFOPM:1xNNTh:3HuL0ZjlacYdaJxprBCNTe8nJfW6zuM37BOs8TdxZ5o	2026-11-15 10:17:33.503118+05:30
u1w1lnusxqdxbep6olw68icie8v1u868	.eJxVjDsOAjEMBe-SGkVO9mtK-j1D5NgxWUBZaT8V4u4o0hbQvpl5bxPo2HM4trSGWczVeDCX3zESP1OpRB5U7ovlpezrHG1V7Ek3Oy2SXrfT_TvItOVaA3htUJQYKQF3rY6NSgddZGQdPAGxh3EgbRw6D-S0TQ576VEji_l8ASamOOQ:1xNNfg:ghy39nsuuI2aFAhKSrMC5O4TI8aKEOoVFbk_Eqbq0vc	2026-11-15 10:29:56.535161+05:30
0l1im340rhwrd8irahw6x92qrcl84pzp	e30:1xNNn7:rHyOsuAgN2xHsmldtmpm_TW5gr3rWGhRu0zh660CGtA	2026-11-15 10:37:37.118451+05:30
ouvizgpp1avx7x0dyoueu2umlmghpcrt	e30:1xNNn8:v2usqbyiPzdM3APQfXaa_iv4efVlfr30MXhbJyo3C9w	2026-11-15 10:37:38.046611+05:30
wxjt480i71y696p7x7g2yri4t3bnvu9n	e30:1xNNn8:v2usqbyiPzdM3APQfXaa_iv4efVlfr30MXhbJyo3C9w	2026-11-15 10:37:38.998357+05:30
5p35bn1e7x2hae7u50r100z9n5cqv92u	.eJxVjLsOgzAMAP_FcxXZeUEYu_cbkJ2YQluBRGCq-u8VEkO73p3uDT3v29jvVdd-KtCBDXD5hcL5qfNhyoPn-2LyMm_rJOZIzGmruS1FX9ez_RuMXEfogK2SeHRZHcaBg2MSiwk1WmHKhDGQb7KXBnObSEMYrGspkcMmFWT4fAH3Hzca:1xNNoU:wUnIz8jF6PSihz764MbX1DunI39KQ5hW1biDqAqvLcU	2026-11-15 10:39:02.478244+05:30
69yffmemzecgv4pk58w5y9xaqdoey3kc	.eJxVjEEKwyAQAP-y5yKucbXJsfe8QVZdatqiEJNT6d9LIIf2OjPMGwLvWwl7lzUsGSYwBJdfGDk9pR4mP7jem0qtbusS1ZGo03Y1tyyv29n-DQr3AhOwQSJBNNfIYokkWXYcLSZ0pLWRgTGic96jGUY9itE5ee8cUtKcI3y-7to3Sw:1xNNoq:2_QAeqyApBtoVYe3X7jvReYSQjhFpjwLHOHY5XyfkOE	2026-11-15 10:39:24.19342+05:30
gku0nqp8huj49qgsol3oth0s20monr5m	e30:1xNO3p:PNfGkM8DVZrywU0fYN-frn-C6FR6mKAEzKhxeRKB1ow	2026-11-15 10:54:53.801099+05:30
v8h09dv99gx8j758v1xm70spj85muh6a	e30:1xNO4P:fSyHyZi4RDtcxfux8C55ZdfesUGpJ8OXTbqn0ZP8DZg	2026-11-15 10:55:29.180737+05:30
x981r9ze9bb3jj8qrh9s2y5dal566892	.eJxVjDsOwjAQBe-yNbK8jn-kpOcM0a7XkACypTipEHdHllJA-WZG7w0T7ds87S2v0yIwgoXTL2NKz1y6kAeVe1Wplm1dWPVEHbapa5X8uhzt38FMbYYRjEXtInOI3nhrMaOmZG6YraBBSsEhix6EB5eE-nasw-DP2gTvJcLnC8RONyM:1xMN3n:-czy4F8ItrEuxMBlc0fmPlTUs2_NrKup5zjmCTQo3jw	2026-11-12 15:38:39.077292+05:30
uxzn30kzwu4ryilwvwgmmyv13co3wiuu	e30:1xNO4P:fSyHyZi4RDtcxfux8C55ZdfesUGpJ8OXTbqn0ZP8DZg	2026-11-15 10:55:29.200044+05:30
yddr3c907xmd805h4v9zmduuuj9cuwgr	.eJxVjMsKwyAQAP_FcxE0PtYee-83yOpuatqiEJNT6L8XIYf2OjPMISLuW4l75zUuJK7CissvS5hfXIegJ9ZHk7nVbV2SHIk8bZf3Rvy-ne3foGAvYzsT-sCayZJT3pHHzMplg5BmAIOkPAcIGoMnNpNWOWlrlDM4sQEQny8FMDgf:1xMN4T:dv46mKWAn19qlwfZawu_dgg2AA9TxqJjWweCNTzz5L8	2026-11-12 15:39:21.221491+05:30
3zcc5kjvghepvhs6gchjzwmhhahmitfm	e30:1xNO4P:fSyHyZi4RDtcxfux8C55ZdfesUGpJ8OXTbqn0ZP8DZg	2026-11-15 10:55:29.209345+05:30
o9mkln40veqdbig8b2qn0g2cx3xpx2q9	.eJxVjDsOgkAUAO_yarNZZL-U9pyBvN8KaiBhoTLe3ZBQaDszmTcMuG_jsFddh0mggwCXX0bIT50PIQ-c74vhZd7WicyRmNNW0y-ir9vZ_g1GrCN0UMQ5Lr7JBa0qp-R8IItOM16zqk0cY4MlM3ksFBrPsQ1URDAIJt_C5wsSfDky:1xMfqk:hxfDb-0lITzJGgS_ak_ayPU0TTbTV05BuA_aiQjNt18	2026-11-13 11:42:26.87511+05:30
uii7rjv5kuosadycbqp7em1tgo0qunwu	.eJxVjMEOgjAQBf9lz6aBslDK0bvfQF67i6CmTSicjP9uSDjodWYybxqxb_O4F13HRWigxtLlFwbEp6bDyAPpnk3MaVuXYI7EnLaYWxZ9Xc_2bzCjzDQQuhhrZ1k0OEGlrVUr2qBj1wdYsAR4wDvx08QRjru-qnUKbXSi7OnzBTzoOYU:1xNO4Z:Enjbzax7kQAhOf1Uy8cr7QZg6o8Mkp-4Bsm6nem0MJw	2026-11-15 10:55:39.061267+05:30
94iev1uelpff9yril8bvy84dz4cam8r3	.eJxVjEEOwiAQRe_C2hBgILQu3XsGMjOAVA0kpV013t2QdKHb_977hwi4byXsPa1hieIqwIrL70jIr1QHiU-sjya51W1dSA5FnrTLe4vpfTvdv4OCvYyaGZxRYBMSsUY2LmkmQjcDTArZI6BKKnqrcp4jZ4feMCnS4CYE8fkCN5I5Ig:1xNOE6:JVpJcW-6c2C-XCGLW1IMxb3cViYq54lsOZyadcoKnFM	2026-11-15 11:05:30.397875+05:30
5vrjgcpjx1jw6vnzzrfkh1218t5r908v	e30:1xNOED:kw32-qPFAhKanBFv_VvSEQYvaWHMjXw1AOUjx8i5rmg	2026-11-15 11:05:37.39866+05:30
ya8k6l5hjq3wwgvbjzstaoht7asv2n22	e30:1xNOED:kw32-qPFAhKanBFv_VvSEQYvaWHMjXw1AOUjx8i5rmg	2026-11-15 11:05:37.411415+05:30
2q4b78f3c2g45366s4d885uwur8u98rl	e30:1xNOED:kw32-qPFAhKanBFv_VvSEQYvaWHMjXw1AOUjx8i5rmg	2026-11-15 11:05:37.416638+05:30
3u16t8720otvu9tlh58yezj1azfwjnu7	e30:1xNT69:qFjORS66iym0N9Arl6SkTHRDAlM23RFW-SS4kyIhSYc	2026-11-15 16:17:37.06135+05:30
o20sulfrrtzpgtu3cgrip3xsxvdw4zrt	e30:1xNT6e:_8WSS_rI-1tyHLsbc5U_nbm0yQI8-Hyf11O-B2pXmGQ	2026-11-15 16:18:08.179928+05:30
h6uuc9g5tgqm3a5prbolj09jll2awxif	e30:1xNT7A:VntBXrj2r3E4Ua0cEntM8ok7TJkow5klBpYnyspqd3g	2026-11-15 16:18:40.330741+05:30
v5k5ni0mfexblkv8jxvp9pt5cxjqk9l1	e30:1xNT7A:VntBXrj2r3E4Ua0cEntM8ok7TJkow5klBpYnyspqd3g	2026-11-15 16:18:40.34538+05:30
84ysy9xo4dul0nzpfk2d844yddc9y4kg	e30:1xNT7A:VntBXrj2r3E4Ua0cEntM8ok7TJkow5klBpYnyspqd3g	2026-11-15 16:18:40.351521+05:30
9v4pva7etup47eddet21ke2u8nmncis9	.eJxVjLsOgzAMAP_FcxUZxySEsXu_ITKxKbQVSDymqv9eITG0693p3pBl34a8r7bkUaEFZrj8wk7K06bD6EOm--zKPG3L2Lkjcadd3W1We13P9m8wyDpAC2QNo1SxromkoDWJGNEKB6-eI_mKfGXJx6DWe-5Q6xSp10Cmgpjg8wXYfjcH:1xNT7L:DzX-ON6pTGzy9RXRNUsSZbzIrnh948o1YFm-xYuVrmA	2026-11-15 16:18:51.798845+05:30
qd3qiysvoor0vbetyn7tzy04jx9o9r73	.eJxVjMsOgjAQAP9lz6Zpy0q3HL3zDc1uHxY1kFA4Gf_dkHDQ68xk3hB432rYW17DlGAARLj8QuH4zPNh0oPn-6LiMm_rJOpI1GmbGpeUX7ez_RtUbhUGINHYiXW9Ru9ZmMWLJU_edKx7LCWSRkrRZy3krtF1hi0yaZdMsZzg8wX4gTfW:1xNT7c:38kUvxBjbD_sds6TrECzcEKFxTCPtcLiTWc7WfFnPhI	2026-11-15 16:19:08.445274+05:30
n32871jeomer4kqvw6rznul8865ny44i	.eJxVjDkOwjAQAP-yNbJ8O05JzxuitXeNA8iWclSIv6NIKaCdGc0bJty3Ou0rL9NMMIK1cPmFCfOT22Hoge3eRe5tW-YkjkScdhW3Tvy6nu3foOJaYYRIaNFFRZJ9LOSNDFp5GrxxnN2Qg5e-MCUVFRESG1McJpaZitYhRfh8ARMTONA:1xNT7z:WVfP5EhxgLaL0DOy8H_tFvtNAa6ST8im4HSKkPOdSdo	2026-11-15 16:19:31.557277+05:30
y7kpnep4sddzgadzpej95ie7jomx5sfp	.eJxVjMsOgjAQAP9lz6bZtnQFjt75hma3D4uaklA4Gf_dkHDQ68xk3uB534rfW1r9HGEEA5dfJhyeqR4iPrjeFxWWuq2zqCNRp21qWmJ63c72b1C4FRiBMlptk7DWLotQHJi6fM3GBETUJsROIg_YoyQMRhOJxezI9YSWSeDzBebqN6Y:1xOXip:yCnT4N8MkpAKNsqqsuEGpvbCiGUC3rpuPtmm3R9YDoo	2026-11-18 15:25:59.331243+05:30
9ya357ucl4c5bpffqgxyhuom3blvngyg	.eJxVjMsOgjAQAP9lz6bZtnQFjt75hma3D4uaklA4Gf_dkHDQ68xk3uB534rfW1r9HGEEA5dfJhyeqR4iPrjeFxWWuq2zqCNRp21qWmJ63c72b1C4FRiBMlptk7DWLotQHJi6fM3GBETUJsROIg_YoyQMRhOJxezI9YSWSeDzBebqN6Y:1xPvbk:-CBDAhLmf8vrYlqAz-ak11B8F6U9B-z_j0-2P-aZY_k	2026-11-22 11:08:24.750099+05:30
0frl68tmwqgtmuck78duetydu6vebm44	.eJxVjMsOgjAQAP9lz6bZtnQFjt75hma3D4uaklA4Gf_dkHDQ68xk3uB534rfW1r9HGEEA5dfJhyeqR4iPrjeFxWWuq2zqCNRp21qWmJ63c72b1C4FRiBMlptk7DWLotQHJi6fM3GBETUJsROIg_YoyQMRhOJxezI9YSWSeDzBebqN6Y:1xQzDX:T9_Ituu0poZ13tCOSf1J8KhpVHQqvS6FyQsynWmEjms	2026-11-25 09:11:47.202946+05:30
m0n64l7q9jx51yzmvs5vqjkha7xmf008	.eJxVjMsOgjAQAP9lz6bZtnQFjt75hma3D4uaklA4Gf_dkHDQ68xk3uB534rfW1r9HGEEA5dfJhyeqR4iPrjeFxWWuq2zqCNRp21qWmJ63c72b1C4FRiBMlptk7DWLotQHJi6fM3GBETUJsROIg_YoyQMRhOJxezI9YSWSeDzBebqN6Y:1xQzgN:QHMNF0yoclozR4IicvU4CL6B9SkT2isulQ-SkCEDBTE	2026-11-25 09:41:35.624315+05:30
g360yhcnjuuynise5rg2wnh47umjozqo	.eJxVjLsOgzAMAP_FcxU5JM6DsXu_ATnYFNoKJAJT1X-vkBja9e50b-h438Zur7p2k0ALhHD5hYX7p86HkQfP98X0y7ytUzFHYk5bzW0RfV3P9m8wch2hBc6E0UkSxaFBkkFyzNG64Dz5ghQ4oXrrQgwxUPJsSTUpNy4UceTh8wXkJzb0:1xSoqm:-llI1HFFi6JVRRR3ltwFkIXFlyyhNxqMJPXB3o-feQo	2026-11-30 10:31:52.659521+05:30
aqfjuhoc9aixeuyt3rd52mvphoserddy	.eJxVjMsOgjAQAP9lz6bZtnQFjt75hma3D4uaklA4Gf_dkHDQ68xk3uB534rfW1r9HGEEA5dfJhyeqR4iPrjeFxWWuq2zqCNRp21qWmJ63c72b1C4FRiBMlptk7DWLotQHJi6fM3GBETUJsROIg_YoyQMRhOJxezI9YSWSeDzBebqN6Y:1xR1W2:5_MPlPj5Jte1RbDBFoJ02HYx3MkcsZpNLrgsiBQ9rsQ	2026-11-25 11:39:02.019327+05:30
pxmj0w3mlitfmqjw6tqjey153zo45w5j	.eJxVjLsOgzAMAP_FcxU5JM6DsXu_ATnYFNoKJAJT1X-vkBja9e50b-h438Zur7p2k0ALhHD5hYX7p86HkQfP98X0y7ytUzFHYk5bzW0RfV3P9m8wch2hBc6E0UkSxaFBkkFyzNG64Dz5ghQ4oXrrQgwxUPJsSTUpNy4UceTh8wXkJzb0:1xSoqy:uesW1TouPA7lyGkClJMChE0q-OsK-0AJWxiYzp9IWl4	2026-11-30 10:32:04.080966+05:30
f4tjnhnyq4q1yy8eegs934h0yf2hcddx	.eJxVjEEOwiAQAP-yZ0PYBQR69N43EGBBqqZNSnsy_t006UGvM5N5Q4j71sLeyxomhgFQwuUXppifZT4MP-J8X0Re5m2dkjgScdouxoXL63a2f4MWe4MByjXHSg6VMZg8GsMqa7Jkk7YaSZGutSL5pKrB5FhmTcpIqbRzzOzh8wXjszcI:1xSp31:wRajG75M68ilx69-b7I5y9ytSKsDeP_YBSmeeRMc6w4	2026-11-30 10:44:31.874464+05:30
lxbrapf8blt9utr21ns251rlucbr3vsi	.eJxVjMsOwiAQAP9lz4a4QIHt0Xu_gfBYpGpoUtqT8d9Nkx70OjOZN_iwb9XvnVc_ZxhBW7j8whjSk9th8iO0-yLS0rZ1juJIxGm7mJbMr9vZ_g1q6BVGQMvSILuC2XBmWwapTJBoSkG0itlEV9hSQKdJEw5KXpU2iYlSUpHg8wUH2zfH:1xRkkZ:PPgy4yu1HZ9WnMmyRkPQCpnfzoy-xl43OCh6FUcRPQ4	2026-11-27 11:57:03.771398+05:30
x0fvppk0uo7imvs01mnch95k2bwx5peb	.eJxVjDEOwjAMAP_iGUVgWifuyN43RImdkAJKpaadEH9HlTrAene6N_iwrcVvLS1-UhiA4fTLYpBnqrvQR6j32chc12WKZk_MYZsZZ02v29H-DUpoBQZAuiDJFTn1HblwzsIdalKJIYoSsyBZ1czEQjkxRyKLDsk621tL8PkC61g3tA:1xSt2H:T7Zywl1tmGDmIGQI0AecAMswJAnMZ4XFjUiwVQ8G47Q	2026-11-30 15:00:01.41265+05:30
mh8ynydeybuxuv8fnl3b5i9nvt98n277	.eJxVjMsOgjAQAP9lz6bZtnQFjt75hma3D4uaklA4Gf_dkHDQ68xk3uB534rfW1r9HGEEA5dfJhyeqR4iPrjeFxWWuq2zqCNRp21qWmJ63c72b1C4FRiBMlptk7DWLotQHJi6fM3GBETUJsROIg_YoyQMRhOJxezI9YSWSeDzBebqN6Y:1xS6Mt:nO0iSRENb0IWKeynoGDlm3EcrDW0IHgy9fCZ7UsOu9w	2026-11-28 11:02:03.022924+05:30
5o7bjvtqqiwlnr6yjfes0njoy87tvade	.eJxVjDEOwjAMAP_iGUVgWifuyN43RImdkAJKpaadEH9HlTrAene6N_iwrcVvLS1-UhiA4fTLYpBnqrvQR6j32chc12WKZk_MYZsZZ02v29H-DUpoBQZAuiDJFTn1HblwzsIdalKJIYoSsyBZ1czEQjkxRyKLDsk621tL8PkC61g3tA:1xTAzR:xER06f1O40WSu2qWxkpigwWothavIDU4SfN8oUqd15E	2026-12-01 10:10:17.639555+05:30
0bjfn4jzb390y813z7qzxcx7k0rv4s1o	.eJxVjMsOgjAQAP9lz6bZtnQFjt75hma3D4uaklA4Gf_dkHDQ68xk3uB534rfW1r9HGEEA5dfJhyeqR4iPrjeFxWWuq2zqCNRp21qWmJ63c72b1C4FRiBMlptk7DWLotQHJi6fM3GBETUJsROIg_YoyQMRhOJxezI9YSWSeDzBebqN6Y:1xSA2f:Ue3R15QhD1EWG_TQGeFNz-f5WWOJV366ZKT3Vgtzg88	2026-11-28 14:57:25.276147+05:30
osza8cts1026ddeyb87dgx4ln9mlnxx1	.eJxVjMsOwiAQAP-FsyEUWFg8eu83kGXZ2qppkz5Oxn83JD3odWYyb5Xp2Md8bLLmqaqr8qguv7AQP2Vupj5ovi-al3lfp6Jbok-76X6p8rqd7d9gpG1sX4NggucIycbiIvrBIjsnEgMHk3AgBwHJxJQ6YOsMeIsCIHboEon6fAHNPzaq:1xTB66:GsHUPC_UUoCzOdCRko0Z3PwftJXtNDL8kztTbVQsYxo	2026-12-01 10:17:10.653982+05:30
jp57cjukyetrtkpf14ix2l2i6vre6u85	.eJxVjMsOgjAQAP9lz6bZtnQFjt75hma3D4uaklA4Gf_dkHDQ68xk3uB534rfW1r9HGEEA5dfJhyeqR4iPrjeFxWWuq2zqCNRp21qWmJ63c72b1C4FRiBMlptk7DWLotQHJi6fM3GBETUJsROIg_YoyQMRhOJxezI9YSWSeDzBebqN6Y:1xTWNs:iTrGx-295LdxdvpRPLYfYF4s6KanOsIUqOvKlM-MayY	2026-12-02 09:00:56.187752+05:30
j7qao0hvux2345nxybi11ja91xcglrf4	.eJxVjMsOgjAQAP9lz6bZtnQFjt75hma3D4uaklA4Gf_dkHDQ68xk3uB534rfW1r9HGEEA5dfJhyeqR4iPrjeFxWWuq2zqCNRp21qWmJ63c72b1C4FRiBMlptk7DWLotQHJi6fM3GBETUJsROIg_YoyQMRhOJxezI9YSWSeDzBebqN6Y:1xSBPu:cUrgTvYia-Ru13AzmoKeMzWXXvKJjDz7N_Dpw0MZfdQ	2026-11-28 16:25:30.472052+05:30
o42km6ehelqblz8b9c4e7tgddtucf6y6	.eJxVjDEOwjAMAP_iGUVgWifuyN43RImdkAJKpaadEH9HlTrAene6N_iwrcVvLS1-UhiA4fTLYpBnqrvQR6j32chc12WKZk_MYZsZZ02v29H-DUpoBQZAuiDJFTn1HblwzsIdalKJIYoSsyBZ1czEQjkxRyKLDsk621tL8PkC61g3tA:1xSSuB:LXMqxLitXnPfttoYFFuLNjA76NR7EhWalFH9ZJCr9AM	2026-11-29 11:05:55.765662+05:30
\.


--
-- Name: app_artistavailability_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_artistavailability_id_seq', 3, true);


--
-- Name: app_artistprofile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_artistprofile_id_seq', 20, true);


--
-- Name: app_booking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_booking_id_seq', 19, true);


--
-- Name: app_bookingcancellation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_bookingcancellation_id_seq', 4, true);


--
-- Name: app_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_category_id_seq', 6, true);


--
-- Name: app_customerprofile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_customerprofile_id_seq', 10, true);


--
-- Name: app_favoriteartist_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_favoriteartist_id_seq', 3, true);


--
-- Name: app_notification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_notification_id_seq', 107, true);


--
-- Name: app_payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_payment_id_seq', 19, true);


--
-- Name: app_portfolio_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_portfolio_id_seq', 6, true);


--
-- Name: app_processedwebhookevent_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_processedwebhookevent_id_seq', 1, true);


--
-- Name: app_refund_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_refund_id_seq', 4, true);


--
-- Name: app_reschedulingrequest_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_reschedulingrequest_id_seq', 1, true);


--
-- Name: app_review_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_review_id_seq', 1, false);


--
-- Name: auth_group_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auth_group_id_seq', 1, false);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auth_group_permissions_id_seq', 1, false);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auth_permission_id_seq', 84, true);


--
-- Name: auth_user_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auth_user_groups_id_seq', 1, false);


--
-- Name: auth_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auth_user_id_seq', 51, true);


--
-- Name: auth_user_user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auth_user_user_permissions_id_seq', 1, false);


--
-- Name: django_admin_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.django_admin_log_id_seq', 1, true);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.django_content_type_id_seq', 21, true);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.django_migrations_id_seq', 38, true);


--
-- Name: app_artistavailability app_artistavailability_artist_id_date_69b7511a_uniq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_artistavailability
    ADD CONSTRAINT app_artistavailability_artist_id_date_69b7511a_uniq UNIQUE (artist_id, date);


--
-- Name: app_artistavailability app_artistavailability_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_artistavailability
    ADD CONSTRAINT app_artistavailability_pkey PRIMARY KEY (id);


--
-- Name: app_artistprofile app_artistprofile_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_artistprofile
    ADD CONSTRAINT app_artistprofile_pkey PRIMARY KEY (id);


--
-- Name: app_artistprofile app_artistprofile_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_artistprofile
    ADD CONSTRAINT app_artistprofile_user_id_key UNIQUE (user_id);


--
-- Name: app_booking app_booking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_booking
    ADD CONSTRAINT app_booking_pkey PRIMARY KEY (id);


--
-- Name: app_bookingcancellation app_bookingcancellation_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_bookingcancellation
    ADD CONSTRAINT app_bookingcancellation_booking_id_key UNIQUE (booking_id);


--
-- Name: app_bookingcancellation app_bookingcancellation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_bookingcancellation
    ADD CONSTRAINT app_bookingcancellation_pkey PRIMARY KEY (id);


--
-- Name: app_category app_category_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_category
    ADD CONSTRAINT app_category_name_key UNIQUE (name);


--
-- Name: app_category app_category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_category
    ADD CONSTRAINT app_category_pkey PRIMARY KEY (id);


--
-- Name: app_customerprofile app_customerprofile_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_customerprofile
    ADD CONSTRAINT app_customerprofile_pkey PRIMARY KEY (id);


--
-- Name: app_customerprofile app_customerprofile_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_customerprofile
    ADD CONSTRAINT app_customerprofile_user_id_key UNIQUE (user_id);


--
-- Name: app_favoriteartist app_favoriteartist_customer_id_artist_id_ca462a87_uniq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_favoriteartist
    ADD CONSTRAINT app_favoriteartist_customer_id_artist_id_ca462a87_uniq UNIQUE (customer_id, artist_id);


--
-- Name: app_favoriteartist app_favoriteartist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_favoriteartist
    ADD CONSTRAINT app_favoriteartist_pkey PRIMARY KEY (id);


--
-- Name: app_notification app_notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_notification
    ADD CONSTRAINT app_notification_pkey PRIMARY KEY (id);


--
-- Name: app_payment app_payment_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_payment
    ADD CONSTRAINT app_payment_booking_id_key UNIQUE (booking_id);


--
-- Name: app_payment app_payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_payment
    ADD CONSTRAINT app_payment_pkey PRIMARY KEY (id);


--
-- Name: app_payment app_payment_razorpay_order_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_payment
    ADD CONSTRAINT app_payment_razorpay_order_id_key UNIQUE (razorpay_order_id);


--
-- Name: app_payment app_payment_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_payment
    ADD CONSTRAINT app_payment_transaction_id_key UNIQUE (transaction_id);


--
-- Name: app_portfolio app_portfolio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_portfolio
    ADD CONSTRAINT app_portfolio_pkey PRIMARY KEY (id);


--
-- Name: app_processedwebhookevent app_processedwebhookevent_event_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_processedwebhookevent
    ADD CONSTRAINT app_processedwebhookevent_event_id_key UNIQUE (event_id);


--
-- Name: app_processedwebhookevent app_processedwebhookevent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_processedwebhookevent
    ADD CONSTRAINT app_processedwebhookevent_pkey PRIMARY KEY (id);


--
-- Name: app_refund app_refund_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_refund
    ADD CONSTRAINT app_refund_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: app_refund app_refund_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_refund
    ADD CONSTRAINT app_refund_pkey PRIMARY KEY (id);


--
-- Name: app_refund app_refund_razorpay_refund_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_refund
    ADD CONSTRAINT app_refund_razorpay_refund_id_key UNIQUE (razorpay_refund_id);


--
-- Name: app_reschedulingrequest app_reschedulingrequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_reschedulingrequest
    ADD CONSTRAINT app_reschedulingrequest_pkey PRIMARY KEY (id);


--
-- Name: app_review app_review_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_review
    ADD CONSTRAINT app_review_booking_id_key UNIQUE (booking_id);


--
-- Name: app_review app_review_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_review
    ADD CONSTRAINT app_review_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_name_key UNIQUE (name);


--
-- Name: auth_group_permissions auth_group_permissions_group_id_permission_id_0cd325b0_uniq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_permission_id_0cd325b0_uniq UNIQUE (group_id, permission_id);


--
-- Name: auth_group_permissions auth_group_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_pkey PRIMARY KEY (id);


--
-- Name: auth_permission auth_permission_content_type_id_codename_01ab375a_uniq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_codename_01ab375a_uniq UNIQUE (content_type_id, codename);


--
-- Name: auth_permission auth_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_pkey PRIMARY KEY (id);


--
-- Name: auth_user_groups auth_user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_user_groups
    ADD CONSTRAINT auth_user_groups_pkey PRIMARY KEY (id);


--
-- Name: auth_user_groups auth_user_groups_user_id_group_id_94350c0c_uniq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_user_groups
    ADD CONSTRAINT auth_user_groups_user_id_group_id_94350c0c_uniq UNIQUE (user_id, group_id);


--
-- Name: auth_user auth_user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_user
    ADD CONSTRAINT auth_user_pkey PRIMARY KEY (id);


--
-- Name: auth_user_user_permissions auth_user_user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_user_user_permissions
    ADD CONSTRAINT auth_user_user_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_user_user_permissions auth_user_user_permissions_user_id_permission_id_14a6b632_uniq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_user_user_permissions
    ADD CONSTRAINT auth_user_user_permissions_user_id_permission_id_14a6b632_uniq UNIQUE (user_id, permission_id);


--
-- Name: auth_user auth_user_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_user
    ADD CONSTRAINT auth_user_username_key UNIQUE (username);


--
-- Name: django_admin_log django_admin_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_pkey PRIMARY KEY (id);


--
-- Name: django_content_type django_content_type_app_label_model_76bd3d3b_uniq; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_app_label_model_76bd3d3b_uniq UNIQUE (app_label, model);


--
-- Name: django_content_type django_content_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_pkey PRIMARY KEY (id);


--
-- Name: django_migrations django_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.django_migrations
    ADD CONSTRAINT django_migrations_pkey PRIMARY KEY (id);


--
-- Name: django_session django_session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.django_session
    ADD CONSTRAINT django_session_pkey PRIMARY KEY (session_key);


--
-- Name: app_artistavailability_artist_id_3b1948be; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_artistavailability_artist_id_3b1948be ON public.app_artistavailability USING btree (artist_id);


--
-- Name: app_artistprofile_category_id_7de4199f; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_artistprofile_category_id_7de4199f ON public.app_artistprofile USING btree (category_id);


--
-- Name: app_booking_artist_id_f1a4d815; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_booking_artist_id_f1a4d815 ON public.app_booking USING btree (artist_id);


--
-- Name: app_booking_customer_id_cc72655a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_booking_customer_id_cc72655a ON public.app_booking USING btree (customer_id);


--
-- Name: app_bookingcancellation_cancelled_by_user_id_d6f2be02; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_bookingcancellation_cancelled_by_user_id_d6f2be02 ON public.app_bookingcancellation USING btree (cancelled_by_user_id);


--
-- Name: app_bookingcancellation_refund_id_bbbb3236; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_bookingcancellation_refund_id_bbbb3236 ON public.app_bookingcancellation USING btree (refund_id);


--
-- Name: app_category_name_06e7588b_like; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_category_name_06e7588b_like ON public.app_category USING btree (name varchar_pattern_ops);


--
-- Name: app_favoriteartist_artist_id_ec2005e1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_favoriteartist_artist_id_ec2005e1 ON public.app_favoriteartist USING btree (artist_id);


--
-- Name: app_favoriteartist_customer_id_6c34428c; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_favoriteartist_customer_id_6c34428c ON public.app_favoriteartist USING btree (customer_id);


--
-- Name: app_notification_user_id_6ab9311d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_notification_user_id_6ab9311d ON public.app_notification USING btree (user_id);


--
-- Name: app_payment_razorpay_order_id_3f3270c6_like; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_payment_razorpay_order_id_3f3270c6_like ON public.app_payment USING btree (razorpay_order_id varchar_pattern_ops);


--
-- Name: app_payment_transaction_id_6dc41051_like; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_payment_transaction_id_6dc41051_like ON public.app_payment USING btree (transaction_id varchar_pattern_ops);


--
-- Name: app_portfolio_artist_id_fac15151; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_portfolio_artist_id_fac15151 ON public.app_portfolio USING btree (artist_id);


--
-- Name: app_processedwebhookevent_event_id_8d983cbc_like; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_processedwebhookevent_event_id_8d983cbc_like ON public.app_processedwebhookevent USING btree (event_id varchar_pattern_ops);


--
-- Name: app_refund_booking_id_d5e90244; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_refund_booking_id_d5e90244 ON public.app_refund USING btree (booking_id);


--
-- Name: app_refund_idempotency_key_6c991660_like; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_refund_idempotency_key_6c991660_like ON public.app_refund USING btree (idempotency_key varchar_pattern_ops);


--
-- Name: app_refund_payment_id_c6259041; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_refund_payment_id_c6259041 ON public.app_refund USING btree (payment_id);


--
-- Name: app_refund_razorpay_refund_id_ff396a74_like; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_refund_razorpay_refund_id_ff396a74_like ON public.app_refund USING btree (razorpay_refund_id varchar_pattern_ops);


--
-- Name: app_reschedulingrequest_artist_id_12ee3a3d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_reschedulingrequest_artist_id_12ee3a3d ON public.app_reschedulingrequest USING btree (artist_id);


--
-- Name: app_reschedulingrequest_booking_id_2753e21f; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_reschedulingrequest_booking_id_2753e21f ON public.app_reschedulingrequest USING btree (booking_id);


--
-- Name: app_reschedulingrequest_customer_id_48379ae8; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_reschedulingrequest_customer_id_48379ae8 ON public.app_reschedulingrequest USING btree (customer_id);


--
-- Name: app_review_artist_id_65084307; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_review_artist_id_65084307 ON public.app_review USING btree (artist_id);


--
-- Name: app_review_customer_id_07eb27f9; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_review_customer_id_07eb27f9 ON public.app_review USING btree (customer_id);


--
-- Name: auth_group_name_a6ea08ec_like; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX auth_group_name_a6ea08ec_like ON public.auth_group USING btree (name varchar_pattern_ops);


--
-- Name: auth_group_permissions_group_id_b120cbf9; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX auth_group_permissions_group_id_b120cbf9 ON public.auth_group_permissions USING btree (group_id);


--
-- Name: auth_group_permissions_permission_id_84c5c92e; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX auth_group_permissions_permission_id_84c5c92e ON public.auth_group_permissions USING btree (permission_id);


--
-- Name: auth_permission_content_type_id_2f476e4b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX auth_permission_content_type_id_2f476e4b ON public.auth_permission USING btree (content_type_id);


--
-- Name: auth_user_groups_group_id_97559544; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX auth_user_groups_group_id_97559544 ON public.auth_user_groups USING btree (group_id);


--
-- Name: auth_user_groups_user_id_6a12ed8b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX auth_user_groups_user_id_6a12ed8b ON public.auth_user_groups USING btree (user_id);


--
-- Name: auth_user_user_permissions_permission_id_1fbb5f2c; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX auth_user_user_permissions_permission_id_1fbb5f2c ON public.auth_user_user_permissions USING btree (permission_id);


--
-- Name: auth_user_user_permissions_user_id_a95ead1b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX auth_user_user_permissions_user_id_a95ead1b ON public.auth_user_user_permissions USING btree (user_id);


--
-- Name: auth_user_username_6821ab7c_like; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX auth_user_username_6821ab7c_like ON public.auth_user USING btree (username varchar_pattern_ops);


--
-- Name: django_admin_log_content_type_id_c4bce8eb; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX django_admin_log_content_type_id_c4bce8eb ON public.django_admin_log USING btree (content_type_id);


--
-- Name: django_admin_log_user_id_c564eba6; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX django_admin_log_user_id_c564eba6 ON public.django_admin_log USING btree (user_id);


--
-- Name: django_session_expire_date_a5c62663; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX django_session_expire_date_a5c62663 ON public.django_session USING btree (expire_date);


--
-- Name: django_session_session_key_c0390e0f_like; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX django_session_session_key_c0390e0f_like ON public.django_session USING btree (session_key varchar_pattern_ops);


--
-- Name: app_artistavailability app_artistavailabili_artist_id_3b1948be_fk_app_artis; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_artistavailability
    ADD CONSTRAINT app_artistavailabili_artist_id_3b1948be_fk_app_artis FOREIGN KEY (artist_id) REFERENCES public.app_artistprofile(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_artistprofile app_artistprofile_category_id_7de4199f_fk_app_category_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_artistprofile
    ADD CONSTRAINT app_artistprofile_category_id_7de4199f_fk_app_category_id FOREIGN KEY (category_id) REFERENCES public.app_category(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_artistprofile app_artistprofile_user_id_93f4d352_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_artistprofile
    ADD CONSTRAINT app_artistprofile_user_id_93f4d352_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_booking app_booking_artist_id_f1a4d815_fk_app_artistprofile_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_booking
    ADD CONSTRAINT app_booking_artist_id_f1a4d815_fk_app_artistprofile_id FOREIGN KEY (artist_id) REFERENCES public.app_artistprofile(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_booking app_booking_customer_id_cc72655a_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_booking
    ADD CONSTRAINT app_booking_customer_id_cc72655a_fk_auth_user_id FOREIGN KEY (customer_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_bookingcancellation app_bookingcancellat_cancelled_by_user_id_d6f2be02_fk_auth_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_bookingcancellation
    ADD CONSTRAINT app_bookingcancellat_cancelled_by_user_id_d6f2be02_fk_auth_user FOREIGN KEY (cancelled_by_user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_bookingcancellation app_bookingcancellation_booking_id_90882762_fk_app_booking_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_bookingcancellation
    ADD CONSTRAINT app_bookingcancellation_booking_id_90882762_fk_app_booking_id FOREIGN KEY (booking_id) REFERENCES public.app_booking(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_bookingcancellation app_bookingcancellation_refund_id_bbbb3236_fk_app_refund_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_bookingcancellation
    ADD CONSTRAINT app_bookingcancellation_refund_id_bbbb3236_fk_app_refund_id FOREIGN KEY (refund_id) REFERENCES public.app_refund(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_customerprofile app_customerprofile_user_id_b693c635_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_customerprofile
    ADD CONSTRAINT app_customerprofile_user_id_b693c635_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_favoriteartist app_favoriteartist_artist_id_ec2005e1_fk_app_artistprofile_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_favoriteartist
    ADD CONSTRAINT app_favoriteartist_artist_id_ec2005e1_fk_app_artistprofile_id FOREIGN KEY (artist_id) REFERENCES public.app_artistprofile(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_favoriteartist app_favoriteartist_customer_id_6c34428c_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_favoriteartist
    ADD CONSTRAINT app_favoriteartist_customer_id_6c34428c_fk_auth_user_id FOREIGN KEY (customer_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_notification app_notification_user_id_6ab9311d_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_notification
    ADD CONSTRAINT app_notification_user_id_6ab9311d_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_payment app_payment_booking_id_e314d038_fk_app_booking_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_payment
    ADD CONSTRAINT app_payment_booking_id_e314d038_fk_app_booking_id FOREIGN KEY (booking_id) REFERENCES public.app_booking(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_portfolio app_portfolio_artist_id_fac15151_fk_app_artistprofile_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_portfolio
    ADD CONSTRAINT app_portfolio_artist_id_fac15151_fk_app_artistprofile_id FOREIGN KEY (artist_id) REFERENCES public.app_artistprofile(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_refund app_refund_booking_id_d5e90244_fk_app_booking_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_refund
    ADD CONSTRAINT app_refund_booking_id_d5e90244_fk_app_booking_id FOREIGN KEY (booking_id) REFERENCES public.app_booking(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_refund app_refund_payment_id_c6259041_fk_app_payment_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_refund
    ADD CONSTRAINT app_refund_payment_id_c6259041_fk_app_payment_id FOREIGN KEY (payment_id) REFERENCES public.app_payment(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_reschedulingrequest app_reschedulingrequ_artist_id_12ee3a3d_fk_app_artis; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_reschedulingrequest
    ADD CONSTRAINT app_reschedulingrequ_artist_id_12ee3a3d_fk_app_artis FOREIGN KEY (artist_id) REFERENCES public.app_artistprofile(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_reschedulingrequest app_reschedulingrequest_booking_id_2753e21f_fk_app_booking_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_reschedulingrequest
    ADD CONSTRAINT app_reschedulingrequest_booking_id_2753e21f_fk_app_booking_id FOREIGN KEY (booking_id) REFERENCES public.app_booking(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_reschedulingrequest app_reschedulingrequest_customer_id_48379ae8_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_reschedulingrequest
    ADD CONSTRAINT app_reschedulingrequest_customer_id_48379ae8_fk_auth_user_id FOREIGN KEY (customer_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_review app_review_artist_id_65084307_fk_app_artistprofile_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_review
    ADD CONSTRAINT app_review_artist_id_65084307_fk_app_artistprofile_id FOREIGN KEY (artist_id) REFERENCES public.app_artistprofile(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_review app_review_booking_id_b4229df5_fk_app_booking_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_review
    ADD CONSTRAINT app_review_booking_id_b4229df5_fk_app_booking_id FOREIGN KEY (booking_id) REFERENCES public.app_booking(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: app_review app_review_customer_id_07eb27f9_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_review
    ADD CONSTRAINT app_review_customer_id_07eb27f9_fk_auth_user_id FOREIGN KEY (customer_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissio_permission_id_84c5c92e_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissio_permission_id_84c5c92e_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissions_group_id_b120cbf9_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_permission auth_permission_content_type_id_2f476e4b_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_user_groups auth_user_groups_group_id_97559544_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_user_groups
    ADD CONSTRAINT auth_user_groups_group_id_97559544_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_user_groups auth_user_groups_user_id_6a12ed8b_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_user_groups
    ADD CONSTRAINT auth_user_groups_user_id_6a12ed8b_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_user_user_permissions auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_user_user_permissions
    ADD CONSTRAINT auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_user_user_permissions auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_user_user_permissions
    ADD CONSTRAINT auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_admin_log django_admin_log_content_type_id_c4bce8eb_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_content_type_id_c4bce8eb_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_admin_log django_admin_log_user_id_c564eba6_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_user_id_c564eba6_fk_auth_user_id FOREIGN KEY (user_id) REFERENCES public.auth_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- PostgreSQL database dump complete
--

\unrestrict JhbOaldKi0EcxJmidzNorLMKNjQQ1Vv2ITUSrDXwBY8mdSGyxggOShYCmSBUjDm

